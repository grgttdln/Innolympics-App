import { NextResponse } from 'next/server';

type GroundingRequest = {
  currentPrompt?: string;
  usedPrompts?: string[];
  imageBase64?: string;
  mimeType?: string;
  round?: number;
  totalRounds?: number;
};

type GeminiResult = {
  isMatch: boolean;
  encouragement: string;
  nextPrompt: string | null;
};

const DEBUG_LOG_PREFIX = '[grounding-game-api]';
const DEFAULT_MODEL_CANDIDATES = [
  process.env.GEMINI_MODEL?.trim(),
  'gemini-3.1-flash',
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
].filter((value): value is string => Boolean(value));

type CachedModels = {
  models: string[];
  expiresAt: number;
};

type WorkingModelCache = {
  model: string;
  expiresAt: number;
};

let modelCache: CachedModels | null = null;
let workingModelCache: WorkingModelCache | null = null;

const WORKING_MODEL_TTL_MS = 60 * 60 * 1000;

const PROMPT_POOL = [
  'Show me something yellow.',
  'Show me something circular.',
  'Show me something soft.',
  'Show me something with straight lines.',
  'Show me something blue.',
] as const;

const SYSTEM_PROMPT =
  "You are a grounding assistant. Your task is to lead the user through a 'Bring Me' game to help them regulate their nervous system. " +
  "Start by asking for ONE specific physical object (e.g., 'Find something red' or 'Find something circular'). " +
  'Accept an image input from the user. Analyze the image. If the object is present, give a very short, warm encouragement and ask for the next item. ' +
  'Complete a cycle of 3-5 items. Use simple, low-energy language. Do not ask the user how they feel; just focus on the objects.';

function toGeminiUrl(apiKey: string, model: string): string {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
}

function toModelsListUrl(apiKey: string): string {
  return `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
}

function normalizeModelName(modelName: string): string {
  return modelName.replace(/^models\//, '');
}

async function getAvailableModelCandidates(apiKey: string): Promise<string[]> {
  const now = Date.now();
  if (modelCache && modelCache.expiresAt > now) {
    return modelCache.models;
  }

  try {
    const response = await fetch(toModelsListUrl(apiKey), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`${DEBUG_LOG_PREFIX} models list non-200`, {
        status: response.status,
        statusText: response.statusText,
        bodyPreview: errorText.slice(0, 300),
      });
      return DEFAULT_MODEL_CANDIDATES;
    }

    const json = (await response.json()) as {
      models?: Array<{ name?: string; supportedGenerationMethods?: string[] }>;
    };

    const discovered = (json.models ?? [])
      .filter((model) =>
        (model.supportedGenerationMethods ?? []).includes('generateContent'),
      )
      .map((model) => normalizeModelName(model.name ?? ''))
      .filter(Boolean);

    const flashFirst = discovered
      .filter((name) => name.toLowerCase().includes('flash'))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
      .reverse();

    const merged = [...flashFirst, ...discovered, ...DEFAULT_MODEL_CANDIDATES];
    const unique = [...new Set(merged)];

    modelCache = {
      models: unique,
      expiresAt: now + 10 * 60 * 1000,
    };

    console.log(`${DEBUG_LOG_PREFIX} discovered models`, {
      count: discovered.length,
      candidates: unique.slice(0, 8),
    });

    return unique;
  } catch (error) {
    console.error(`${DEBUG_LOG_PREFIX} models list failed`, {
      error: error instanceof Error ? error.message : 'unknown error',
    });
    return DEFAULT_MODEL_CANDIDATES;
  }
}

function getCachedWorkingModel(): string | null {
  const now = Date.now();
  if (!workingModelCache || workingModelCache.expiresAt <= now) {
    return null;
  }

  return workingModelCache.model;
}

function setCachedWorkingModel(model: string) {
  workingModelCache = {
    model,
    expiresAt: Date.now() + WORKING_MODEL_TTL_MS,
  };
}

function clearCachedWorkingModel(model?: string) {
  if (!workingModelCache) {
    return;
  }

  if (model && workingModelCache.model !== model) {
    return;
  }

  workingModelCache = null;
}

function parseGeminiJson(rawText: string): GeminiResult | null {
  try {
    const parsed = JSON.parse(rawText) as Partial<GeminiResult>;
    if (typeof parsed.isMatch !== 'boolean') {
      return null;
    }
    if (typeof parsed.encouragement !== 'string') {
      return null;
    }
    if (
      parsed.nextPrompt !== null &&
      parsed.nextPrompt !== undefined &&
      typeof parsed.nextPrompt !== 'string'
    ) {
      return null;
    }

    return {
      isMatch: parsed.isMatch,
      encouragement: parsed.encouragement.trim().slice(0, 140),
      nextPrompt: (parsed.nextPrompt ?? null)?.trim().slice(0, 80) ?? null,
    };
  } catch {
    return null;
  }
}

function fallbackResult(isFinalRound: boolean): GeminiResult {
  return {
    isMatch: false,
    encouragement: 'Not quite yet. Try one more clear shot.',
    nextPrompt: isFinalRound ? null : 'Show me something circular.',
  };
}

function getFallbackNextPrompt(currentPrompt: string, round: number): string {
  const normalized = currentPrompt.toLowerCase();
  const usedIndex = PROMPT_POOL.findIndex(
    (item) => item.toLowerCase() === normalized,
  );

  if (usedIndex >= 0 && PROMPT_POOL[usedIndex + 1]) {
    return PROMPT_POOL[usedIndex + 1];
  }

  const clampedRound = Math.max(1, Math.min(PROMPT_POOL.length, round));
  return PROMPT_POOL[clampedRound] ?? 'Show me something circular.';
}

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error(`${DEBUG_LOG_PREFIX} missing GEMINI_API_KEY`);
    return NextResponse.json(
      { error: 'Missing GEMINI_API_KEY on server.' },
      { status: 500 },
    );
  }

  const body = (await request.json().catch(() => null)) as GroundingRequest | null;
  const currentPrompt = body?.currentPrompt?.trim();
  const usedPrompts = (body?.usedPrompts ?? [])
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 80);
  const imageBase64 = body?.imageBase64?.trim();
  const mimeType = body?.mimeType?.trim() || 'image/jpeg';
  const round = Math.max(1, Math.min(10, Number(body?.round ?? 1)));
  const hasRoundLimit =
    typeof body?.totalRounds === 'number' &&
    Number.isFinite(body.totalRounds) &&
    body.totalRounds > 0;
  const totalRounds = hasRoundLimit
    ? Math.max(1, Math.min(999, Math.trunc(body.totalRounds ?? 1)))
    : null;

  if (!currentPrompt || !imageBase64) {
    console.warn(`${DEBUG_LOG_PREFIX} invalid request body`, {
      hasPrompt: Boolean(currentPrompt),
      hasImage: Boolean(imageBase64),
    });
    return NextResponse.json(
      { error: 'currentPrompt and imageBase64 are required.' },
      { status: 400 },
    );
  }

  console.log(`${DEBUG_LOG_PREFIX} analyze request`, {
    round,
    totalRounds,
    currentPrompt,
    usedPromptCount: usedPrompts.length,
    mimeType,
    imageSize: imageBase64.length,
  });

  const isFinalRound = totalRounds ? round >= totalRounds : false;
  const usedPromptsList = usedPrompts.length
    ? usedPrompts.map((item) => `- ${item}`).join('\n')
    : '- None yet';

  const userPrompt =
    `Current requested item: ${currentPrompt}\n` +
    `Current item number: ${round}${totalRounds ? ` of ${totalRounds}` : ' (no fixed limit)'}\n` +
    `Already used prompts (do not repeat):\n${usedPromptsList}\n\n` +
    'Look at the image and decide if the requested object is clearly present. ' +
    'Respond with strict JSON only in this exact shape:\n' +
    '{"isMatch": boolean, "encouragement": string, "nextPrompt": string | null}\n\n' +
    'Rules:\n' +
    '- encouragement must be short, warm, and low-energy.\n' +
    '- If isMatch is false, nextPrompt must be null.\n' +
    '- If isMatch is true and this is not the final item, nextPrompt must be ONE simple object request sentence.\n' +
    '- nextPrompt must be different from the current prompt and not in the used prompts list.\n' +
    '- Prefer concrete visual properties (color, shape, texture, material).\n' +
    '- If this is the final item and isMatch is true, nextPrompt must be null.';

  try {
    const cachedWorkingModel = getCachedWorkingModel();
    let modelCandidates = cachedWorkingModel
      ? [cachedWorkingModel]
      : await getAvailableModelCandidates(apiKey);

    if (cachedWorkingModel) {
      console.log(`${DEBUG_LOG_PREFIX} using cached working model`, {
        model: cachedWorkingModel,
      });
    }

    let json: {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    } | null = null;
    let usedModel: string | null = null;
    let attemptedFallbackDiscovery = false;

    while (true) {
      json = null;
      usedModel = null;

      for (const model of modelCandidates) {
        console.log(`${DEBUG_LOG_PREFIX} attempting model`, { model });

        const response = await fetch(toGeminiUrl(apiKey, model), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: SYSTEM_PROMPT }],
            },
            generationConfig: {
              temperature: 0.3,
              responseMimeType: 'application/json',
            },
            contents: [
              {
                role: 'user',
                parts: [
                  { text: userPrompt },
                  {
                    inline_data: {
                      mime_type: mimeType,
                      data: imageBase64,
                    },
                  },
                ],
              },
            ],
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`${DEBUG_LOG_PREFIX} gemini non-200`, {
            model,
            status: response.status,
            statusText: response.statusText,
            bodyPreview: errorText.slice(0, 300),
          });

          if (model === cachedWorkingModel) {
            clearCachedWorkingModel(model);
          }
          continue;
        }

        json = (await response.json()) as {
          candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
        };
        usedModel = model;
        console.log(`${DEBUG_LOG_PREFIX} model success`, { model });
        break;
      }

      if (json) {
        break;
      }

      if (cachedWorkingModel && !attemptedFallbackDiscovery) {
        attemptedFallbackDiscovery = true;
        modelCandidates = await getAvailableModelCandidates(apiKey);
        console.warn(`${DEBUG_LOG_PREFIX} cached model failed, retrying discovery`, {
          candidateCount: modelCandidates.length,
          topCandidates: modelCandidates.slice(0, 5),
        });
        continue;
      }

      break;
    }

    if (!json) {
      const fallback = fallbackResult(isFinalRound);
      return NextResponse.json({
        ...fallback,
        gameComplete: false,
      });
    }

    const text = json.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    if (usedModel) {
      setCachedWorkingModel(usedModel);
      console.log(`${DEBUG_LOG_PREFIX} pinned working model`, { model: usedModel });
    }

    console.log(`${DEBUG_LOG_PREFIX} raw model payload`, {
      preview: text.slice(0, 220),
    });

    const parsed = parseGeminiJson(text) ?? fallbackResult(isFinalRound);

    const gameComplete = parsed.isMatch && isFinalRound;
    const nextPrompt =
      parsed.isMatch && !isFinalRound
        ? parsed.nextPrompt || getFallbackNextPrompt(currentPrompt, round)
        : null;

    console.log(`${DEBUG_LOG_PREFIX} parsed result`, {
      isMatch: parsed.isMatch,
      encouragement: parsed.encouragement,
      nextPrompt,
      gameComplete,
    });

    return NextResponse.json({
      isMatch: parsed.isMatch,
      encouragement: parsed.encouragement,
      nextPrompt,
      gameComplete,
    });
  } catch (error) {
    console.error(`${DEBUG_LOG_PREFIX} request failed`, {
      error: error instanceof Error ? error.message : 'unknown error',
    });
    const fallback = fallbackResult(isFinalRound);
    return NextResponse.json({
      ...fallback,
      gameComplete: false,
    });
  }
}