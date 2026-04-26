import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { journalEntries, professionalReviews } from "@/lib/db/schema";
import { requireUser } from "@/lib/api/require-user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
    const auth = await requireUser(request);
    if (auth instanceof NextResponse) return auth;

    const rows = await db
        .select({
            reviewId: professionalReviews.id,
            entryId: professionalReviews.entryId,
            comment: professionalReviews.comment,
            reviewedAt: professionalReviews.createdAt,
        })
        .from(professionalReviews)
        .innerJoin(
            journalEntries,
            eq(professionalReviews.entryId, journalEntries.id),
        )
        .where(
            and(
                eq(journalEntries.userId, auth.userId),
                eq(professionalReviews.reviewed, true),
            ),
        );

    return NextResponse.json({ feedback: rows });
}
