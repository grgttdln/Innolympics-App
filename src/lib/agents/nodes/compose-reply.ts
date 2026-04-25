import type { GraphState, GraphStateUpdate } from "@/lib/agents/state";

/**
 * No LLM. Defensive formatter — strips accidental markdown so the
 * whitespace-pre-wrap renderer on the UI side doesn't show literal
 * asterisks and hashes.
 *
 * The persona prompts already instruct the model to write prose, not
 * markdown. This is belt-and-suspenders for the cases it forgets.
 * Kept narrow: we only rewrite markers that would read as noise,
 * never touch paragraph structure or content.
 */
export async function composeReply(
  state: GraphState,
): Promise<GraphStateUpdate> {
  const cleaned = stripMarkdown(state.draft_response).trim();
  return { draft_response: cleaned };
}

export function stripMarkdown(text: string): string {
  let out = text;

  // Bold / italic markers:  **word** | __word__ | *word* | _word_
  // Replace with just the inner text. We walk the non-greedy match.
  out = out.replace(/\*\*(.+?)\*\*/g, "$1");
  out = out.replace(/__(.+?)__/g, "$1");
  out = out.replace(/(^|[^*])\*(?!\s)([^*\n]+?)\*(?!\*)/g, "$1$2");
  out = out.replace(/(^|[^_])_(?!\s)([^_\n]+?)_(?!_)/g, "$1$2");

  // Inline code backticks:  `word` → word
  out = out.replace(/`([^`\n]+)`/g, "$1");

  // Bullet prefixes at line start:
  //   "*   foo"  |  "- foo"  |  "+ foo"  → "foo"
  // Preserve indentation-free paragraphs.
  out = out.replace(/^[\t ]*[*\-+][\t ]+/gm, "");

  // Heading markers at line start: "## foo" → "foo"
  out = out.replace(/^[\t ]*#{1,6}[\t ]+/gm, "");

  // Numbered list prefixes at line start: "1. foo" → "foo"
  // Only strip when followed by whitespace + text so we don't eat
  // something like "5 things" mid-sentence.
  out = out.replace(/^[\t ]*\d+\.[\t ]+/gm, "");

  // Collapse runs of 3+ newlines into 2 so paragraph spacing stays sane
  // after the above substitutions.
  out = out.replace(/\n{3,}/g, "\n\n");

  return out;
}
