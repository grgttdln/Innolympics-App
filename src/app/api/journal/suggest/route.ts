import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { suggestFollowUp, validateBlocks } from "@/lib/gemini";

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ skip: true }, { status: 200 });
  }

  const userIdHeader = request.headers.get("x-user-id");
  const userId = userIdHeader ? Number.parseInt(userIdHeader, 10) : NaN;
  if (!Number.isFinite(userId)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { blocks?: unknown } | null;
  const blocks = validateBlocks(body?.blocks);
  if (!blocks) {
    return NextResponse.json({ error: "Invalid blocks" }, { status: 400 });
  }

  const result = await suggestFollowUp(blocks, apiKey);

  if (result.kind === "question") {
    return NextResponse.json({ question: result.question });
  }
  if (result.kind === "blocked") {
    return NextResponse.json({ blocked: true });
  }
  return NextResponse.json({ skip: true });
}
