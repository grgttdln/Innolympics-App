import { GoogleGenAI } from "@google/genai";

// text-embedding-004 has been deprecated from v1beta embedContent; use
// gemini-embedding-001 with outputDimensionality=768 to match the schema.
const EMBED_MODEL = "gemini-embedding-001";
const EMBED_DIM = 768;

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (!client) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
    client = new GoogleGenAI({ apiKey });
  }
  return client;
}

/**
 * Produce a 768-dimension embedding for `text` using Gemini
 * `text-embedding-004`. Throws on API error; callers decide whether to
 * treat the failure as fatal or fall back to a zero-length context.
 */
export async function embedText(text: string): Promise<number[]> {
  if (!text || !text.trim()) {
    throw new Error("embedText: empty input");
  }

  const result = await getClient().models.embedContent({
    model: EMBED_MODEL,
    contents: text,
    config: { outputDimensionality: EMBED_DIM },
  });

  const vec = result.embeddings?.[0]?.values;
  if (!Array.isArray(vec) || vec.length !== EMBED_DIM) {
    throw new Error(
      `embedText: expected ${EMBED_DIM}-dim vector, got ${vec?.length ?? "none"}`,
    );
  }
  return vec;
}

export const EMBEDDING_DIMENSIONS = EMBED_DIM;
