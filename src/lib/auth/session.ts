import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq, gt, isNull } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { sha256, token, uid } from "@/lib/util/ids";
import type { Role } from "@/lib/domain/types";
import type { User } from "@/lib/db/schema";

const COOKIE = "al_session";
const SESSION_DAYS = 14;

export async function createSession(userId: string): Promise<void> {
  const db = await getDb();
  const raw = token(32);
  const h = await headers();
  await db.insert(schema.sessions).values({
    id: sha256(raw),
    userId,
    expiresAt: new Date(Date.now() + SESSION_DAYS * 86400_000),
    userAgent: h.get("user-agent")?.slice(0, 200) ?? null,
  });
  await db.update(schema.users).set({ lastLoginAt: new Date() }).where(eq(schema.users.id, userId));
  const c = await cookies();
  c.set(COOKIE, raw, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && !process.env.INSECURE_COOKIES,
    path: "/",
    maxAge: SESSION_DAYS * 86400,
  });
}

export async function destroySession(): Promise<void> {
  const c = await cookies();
  const raw = c.get(COOKIE)?.value;
  if (raw) {
    const db = await getDb();
    await db.delete(schema.sessions).where(eq(schema.sessions.id, sha256(raw)));
  }
  c.delete(COOKIE);
}

export const getUser = cache(async (): Promise<User | null> => {
  const c = await cookies();
  const raw = c.get(COOKIE)?.value;
  if (!raw) return null;
  const db = await getDb();
  const rows = await db
    .select({ user: schema.users })
    .from(schema.sessions)
    .innerJoin(schema.users, eq(schema.users.id, schema.sessions.userId))
    .where(and(eq(schema.sessions.id, sha256(raw)), gt(schema.sessions.expiresAt, new Date())))
    .limit(1);
  return rows[0]?.user ?? null;
});

export async function requireUser(roles?: Role[], next?: string): Promise<User> {
  const user = await getUser();
  if (!user) redirect(`/inloggen${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  if (roles && !roles.includes(user.role)) redirect(user.role === "notaris" ? "/notaris" : user.role === "beheer" ? "/beheer" : "/portaal");
  return user;
}

export { findOrCreateUser } from "./users";

/** Magic link: maakt een eenmalig token (15 min geldig). Retourneert de login-URL. */
export async function createLoginLink(email: string, redirectTo?: string): Promise<string> {
  const db = await getDb();
  const raw = token(24);
  await db.insert(schema.loginTokens).values({
    id: sha256(raw),
    email: email.trim().toLowerCase(),
    redirectTo: redirectTo ?? null,
    expiresAt: new Date(Date.now() + 15 * 60_000),
  });
  const { BRAND } = await import("@/lib/config");
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? (process.env.APP_MODE === "production" ? BRAND.url : "");
  return `${base}/inloggen/link?token=${raw}`;
}

export async function consumeLoginToken(raw: string): Promise<{ user: User; redirectTo: string | null } | null> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(schema.loginTokens)
    .where(and(eq(schema.loginTokens.id, sha256(raw)), gt(schema.loginTokens.expiresAt, new Date()), isNull(schema.loginTokens.usedAt)))
    .limit(1);
  const t = rows[0];
  if (!t) return null;
  await db.update(schema.loginTokens).set({ usedAt: new Date() }).where(eq(schema.loginTokens.id, t.id));
  const users = await db.select().from(schema.users).where(eq(schema.users.email, t.email)).limit(1);
  const user = users[0];
  if (!user) return null;
  if (!user.emailVerifiedAt) await db.update(schema.users).set({ emailVerifiedAt: new Date() }).where(eq(schema.users.id, user.id));
  return { user, redirectTo: t.redirectTo };
}
