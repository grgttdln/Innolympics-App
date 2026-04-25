import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 });
    }

    const { sense, userInput } = await req.json() as {
      sense: string;
      userInput: string;
    };

    if (!userInput?.trim()) {
      return NextResponse.json({ error: 'No input provided' }, { status: 400 });
    }

    const systemPrompt = `You are an empathetic validation engine for a mental health app called Tala. The user is completing a 5-4-3-2-1 grounding exercise.

They are currently on the step where they must name things they can ${sense.toLowerCase()}.
The user provided the following input: "${userInput}"

Your task is to verify if their input logically matches the requested sense.
Rule 1: Be generous but logical (e.g., if the sense is "hear" and they type "my blanket", that is incorrect. If they type "the fan", that is correct).
Rule 2: If the input is nonsense or inappropriate, mark it as invalid.
Rule 3: You MUST respond ONLY with a valid JSON object. Do not include markdown formatting, backticks, or conversational text outside the JSON.

Output format:
{
  "isValid": boolean,
  "feedback": "string"
}

If isValid is true: The feedback should be a very brief, warm validation (e.g., "That's a great observation. Take a breath and let's continue.").
If isValid is false: The feedback should be a gentle, non-judgmental correction asking them to try again (e.g., "I think you might be feeling your blanket rather than hearing it. Let's try listening closely again. What is one thing you can hear?").`;

    const ai = new GoogleGenAI({ apiKey });
    const result = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: systemPrompt }] }],
    });
    const raw = (result.text ?? '').trim();

    let parsed: { isValid: boolean; feedback: string };
    try {
      parsed = JSON.parse(raw);
    } catch {
      // Gemini sometimes wraps in markdown code fences despite instructions — strip them
      const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
      parsed = JSON.parse(cleaned);
    }

    return NextResponse.json({ isValid: parsed.isValid, feedback: parsed.feedback });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[grounding API]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
