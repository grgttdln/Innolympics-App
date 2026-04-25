import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

/**
 * Canonical x-user-id header check used by all journaling API routes.
 * Matches the pattern at src/app/api/journal/suggest/route.ts.
 */
export async function requireUser(
  request: Request,
): Promise<{ userId: number } | NextResponse> {
  const header = request.headers.get("x-user-id");
  const userId = header ? Number.parseInt(header, 10) : NaN;
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

  return { userId };
}
