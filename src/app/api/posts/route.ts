import { desc } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { posts } from "@/lib/db/schema";

export async function GET() {
  const rows = await db.select().from(posts).orderBy(desc(posts.createdAt));
  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const body = (await request.json()) as { title?: string; body?: string };

  if (!body.title || !body.body) {
    return NextResponse.json(
      { error: "title and body are required" },
      { status: 400 },
    );
  }

  const [created] = await db
    .insert(posts)
    .values({ title: body.title, body: body.body })
    .returning();

  return NextResponse.json(created, { status: 201 });
}
