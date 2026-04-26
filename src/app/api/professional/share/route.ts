import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { journalEntries, professionalReviews } from "@/lib/db/schema";
import { requireUser } from "@/lib/api/require-user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
    entry_id: z.string().uuid(),
});

export async function POST(request: Request): Promise<Response> {
    const auth = await requireUser(request);
    if (auth instanceof NextResponse) return auth;

    const raw = await request.json().catch(() => null);
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) {
        return NextResponse.json(
            { error: "Invalid body", issues: parsed.error.issues },
            { status: 400 },
        );
    }

    // Verify the entry belongs to the requesting user
    const [entry] = await db
        .select({ id: journalEntries.id })
        .from(journalEntries)
        .where(
            and(
                eq(journalEntries.id, parsed.data.entry_id),
                eq(journalEntries.userId, auth.userId),
            ),
        )
        .limit(1);

    if (!entry) {
        return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    // Check if already shared
    const [existing] = await db
        .select({ id: professionalReviews.id })
        .from(professionalReviews)
        .where(eq(professionalReviews.entryId, parsed.data.entry_id))
        .limit(1);

    if (existing) {
        return NextResponse.json({ success: true, already_shared: true });
    }

    await db.insert(professionalReviews).values({
        entryId: parsed.data.entry_id,
        comment: null,
        reviewed: false,
    });

    return NextResponse.json({ success: true });
}
