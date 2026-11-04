import "server-only";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { uid } from "@/lib/util/ids";
import type { Role } from "@/lib/domain/types";
import type { User } from "@/lib/db/schema";

export async function findOrCreateUser(email: string, name: string, role: Role = "klant", phone?: string): Promise<User> {
  const db = await getDb();
  const norm = email.trim().toLowerCase();
  const existing = await db.select().from(schema.users).where(eq(schema.users.email, norm)).limit(1);
  if (existing[0]) return existing[0];
  const [u] = await db.insert(schema.users).values({ id: uid(), email: norm, name, role, phone: phone ?? null }).returning();
  return u;
}
