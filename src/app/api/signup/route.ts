import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_RE = /^(?=.*\d)(?=.*[^\w\s]).{8,}$/;

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { email?: string; name?: string; password?: string }
    | null;

  const email = body?.email?.trim().toLowerCase();
  const name = body?.name?.trim();
  const password = body?.password ?? "";

  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }
  if (!name) {
    return NextResponse.json({ error: "Name required" }, { status: 400 });
  }
  if (!PASSWORD_RE.test(password)) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters with a number and symbol" },
      { status: 400 },
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);

  try {
    const [created] = await db
      .insert(users)
      .values({ email, name, passwordHash })
      .returning({ id: users.id, email: users.email, name: users.name });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("users_email_unique")) {
      return NextResponse.json(
        { error: "An account with that email already exists" },
        { status: 409 },
      );
    }
    throw error;
  }
}
