"use server";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { sha256 } from "@/lib/util/ids";
import { findOrCreateUser } from "@/lib/auth/users";
import { createSession } from "@/lib/auth/session";
import { logEvent } from "@/lib/domain/dossier";
import { runAutomations } from "@/lib/automation/engine";

export async function activateInvite(token: string) {
  const db = await getDb();
  const [p] = await db.select().from(schema.parties).where(eq(schema.parties.inviteToken, sha256(token))).limit(1);
  if (!p || !p.email) redirect("/inloggen?fout=verlopen");
  const user = await findOrCreateUser(p.email, p.displayName, "klant", p.phone ?? undefined);
  await db.update(schema.users).set({ emailVerifiedAt: new Date() }).where(eq(schema.users.id, user.id));
  await db.update(schema.parties).set({ userId: user.id, activatedAt: new Date(), inviteToken: null }).where(eq(schema.parties.id, p.id));
  await logEvent({ dossierId: p.dossierId, actorType: "klant", actor: user, type: `${p.side}.geactiveerd`, message: `${p.displayName} heeft het ${p.side === "verkoper" ? "verkopers" : ""}portaal geactiveerd.`, visibleTo: p.side });
  await createSession(user.id);
  await runAutomations(p.dossierId, "activatie");
  redirect(`/portaal/${p.dossierId}`);
}
