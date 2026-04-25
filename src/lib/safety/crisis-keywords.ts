/**
 * Keyword phrases that trigger the fail-safe crisis route. Pure strings —
 * consumed by both the server-side classifier fallback and the client-side
 * voice interceptor.
 *
 * Rules for adding to this list:
 *   - Every entry must be lowercase.
 *   - Hyphens are permitted; they are matched literally.
 *   - Multi-word phrases match with flexible internal whitespace.
 *   - Prefer short, high-precision phrases; the scanner is backed by
 *     word-boundary regex, so "die" alone would fire on "dietary" — avoid it.
 */
export const CRISIS_KEYWORDS: readonly string[] = [
  // English — direct self-harm or suicidal statements
  "kill myself",
  "killing myself",
  "end it all",
  "end my life",
  "take my life",
  "taking my life",
  "suicide",
  "suicidal",
  "want to die",
  "wanna die",
  "wish i was dead",
  "no reason to live",
  "nothing to live for",
  "better off dead",
  "self-harm",
  "self harm",
  "hurt myself",
  "hurting myself",
  "cut myself",
  "cutting myself",
  "slit my wrists",
  "slit my wrist",
  "overdose",
  "od myself",
  "jump off",
  "hang myself",
  "shoot myself",
  "not worth living",
  "cant go on",
  "can't go on",
  "cease to exist",
  "disappear forever",
  "nobody would miss me",
  "better off without me",
  "wont be around much longer",
  "won't be around much longer",

  // Tagalog / Taglish
  "papatayin ko sarili ko",
  "papatayin ko ang sarili ko",
  "gusto ko nang mamatay",
  "gusto ko mamatay",
  "ayoko na mabuhay",
  "ayoko nang mabuhay",
  "wala nang kwenta buhay ko",
  "wala na akong dahilan mabuhay",
  "saktan ang sarili",
  "saktan ko sarili ko",
];
