import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { journalEntries } from "@/lib/db/schema";
import { requireUser } from "@/lib/api/require-user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const auth = await requireUser(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Missing entry id" }, { status: 400 });
  }

  const deleted = await db
    .delete(journalEntries)
    .where(
      and(
        eq(journalEntries.id, id),
        eq(journalEntries.userId, auth.userId),
      ),
    )
    .returning({ id: journalEntries.id });

  if (deleted.length === 0) {
    return NextResponse.json({ error: "Entry not found" }, { status: 404 });
  }

  return NextResponse.json({ deleted: deleted[0].id });
}
