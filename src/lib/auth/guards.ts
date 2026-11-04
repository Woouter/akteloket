import "server-only";
import { notFound, redirect } from "next/navigation";
import { getUser } from "./session";
import { loadDossierView, type DossierView } from "@/lib/domain/dossier";
import type { Party, User } from "@/lib/db/schema";
import type { Side } from "@/lib/domain/types";

export interface PartyAccess { user: User; view: DossierView; side: Side; me: Party; mine: Party[] }

/** Toegang tot een dossier als partij. Koper en verkoper zien alleen hun eigen kant. */
export async function requireParty(dossierId: string, next?: string): Promise<PartyAccess> {
  const user = await getUser();
  if (!user) redirect(`/inloggen?next=${encodeURIComponent(next ?? `/portaal/${dossierId}`)}`);
  const view = await loadDossierView(dossierId);
  if (!view) notFound();
  const me = view.parties.find((p) => p.userId === user.id);
  if (!me) {
    if (user.role === "notaris") redirect(`/notaris/dossiers/${dossierId}`);
    if (user.role === "beheer") redirect(`/beheer/dossiers/${dossierId}`);
    notFound();
  }
  return { user, view, side: me.side, me, mine: view.parties.filter((p) => p.side === me.side) };
}

export async function requireStaff(dossierId?: string): Promise<{ user: User; view: DossierView | null }> {
  const user = await getUser();
  if (!user) redirect(`/inloggen?next=${encodeURIComponent(dossierId ? `/notaris/dossiers/${dossierId}` : "/notaris")}`);
  if (user.role !== "notaris" && user.role !== "beheer") redirect("/portaal");
  const view = dossierId ? await loadDossierView(dossierId) : null;
  if (dossierId && !view) notFound();
  return { user, view };
}
