import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { journalEntries, professionalReviews } from "@/lib/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
    const rows = await db
        .select({
            reviewId: professionalReviews.id,
            entryId: professionalReviews.entryId,
            comment: professionalReviews.comment,
            reviewed: professionalReviews.reviewed,
            reviewCreatedAt: professionalReviews.createdAt,
            transcript: journalEntries.transcript,
            aiResponse: journalEntries.aiResponse,
            intent: journalEntries.intent,
            severity: journalEntries.severity,
            moodScore: journalEntries.moodScore,
            emotions: journalEntries.emotions,
            flagged: journalEntries.flagged,
            inputType: journalEntries.inputType,
            entryCreatedAt: journalEntries.createdAt,
        })
        .from(professionalReviews)
        .innerJoin(
            journalEntries,
            eq(professionalReviews.entryId, journalEntries.id),
        )
        .orderBy(desc(professionalReviews.createdAt));

    return NextResponse.json({ cases: rows });
}
