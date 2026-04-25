import { PH_HOTLINES } from "./ph-hotlines";

const hotlineBlock = [
  `• ${PH_HOTLINES.NCMH.name}: ${PH_HOTLINES.NCMH.number} (${PH_HOTLINES.NCMH.note})`,
  `• ${PH_HOTLINES.HOPELINE.name}: ${PH_HOTLINES.HOPELINE.number}`,
  `• ${PH_HOTLINES.IN_TOUCH.name}: ${PH_HOTLINES.IN_TOUCH.number}`,
].join("\n");

/**
 * Used by the text-mode `crisis_handler` node. Returned verbatim as the
 * `ai_response` on crisis-classified entries. No LLM involved.
 */
export const CRISIS_HANDLER_PH = `I hear you, and I'm worried about your safety right now. You don't have to go through this alone. Please reach out:

${hotlineBlock}

These lines are staffed by people trained to help. If you are in immediate danger, please call 911 or go to the nearest emergency room.

I'm going to stay quiet for now — the people at those numbers can help you in a way I cannot. Please reach out to one of them.`;

/**
 * Spoken/displayed by the voice-mode client-side crisis interceptor the
 * instant a crisis keyword is detected. Shorter than the handler template
 * because the UI also renders a full support card alongside it.
 */
export const CRISIS_INTERCEPT_PH = `I hear you, and I want you to know that help is available right now. Please reach out to one of these lines — they're free, confidential, and staffed by people trained to help:

${hotlineBlock}

You don't have to go through this alone.`;

/**
 * Used when the safety gate fails a draft response three times in a row.
 * Neutral, safe fallback with no therapeutic claims.
 */
export const SAFE_FALLBACK_TEXT = `Thank you for sharing that with me. I want to make sure I respond to you carefully, so I'm going to keep this short.

What you're feeling matters. If anything in what you wrote feels heavier than you can carry alone, please consider reaching out to someone you trust — a friend, a family member, or a professional. You're not alone in this.`;
