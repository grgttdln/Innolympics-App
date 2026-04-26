import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { professionalReviews } from "@/lib/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
    comment: z.string().min(1).max(5000),
});

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
    const { id } = await params;

    const raw = await request.json().catch(() => null);
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) {
        return NextResponse.json(
            { error: "Invalid body", issues: parsed.error.issues },
            { status: 400 },
        );
    }

    const [updated] = await db
        .update(professionalReviews)
        .set({
            comment: parsed.data.comment,
            reviewed: true,
        })
        .where(eq(professionalReviews.id, id))
        .returning({ id: professionalReviews.id });

    if (!updated) {
        return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
}
