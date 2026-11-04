import "server-only";
import type { User } from "@/lib/db/schema";
import type { DocMeta, DossierView } from "@/lib/domain/dossier";

/** Mag deze gebruiker dit document zien? Koper/verkoper strikt gescheiden; Wwft-stukken alleen voor de notaris. */
export function canSeeDocument(user: User, view: DossierView, doc: Pick<DocMeta, "visibility" | "kind" | "createdBy" | "partyId">): boolean {
  if (user.role === "notaris") return true;
  if (user.role === "beheer") return doc.kind !== "wwft_bewijs";
  const me = view.parties.find((p) => p.userId === user.id);
  if (!me) return false;
  if (doc.createdBy === user.id) return true;
  if (doc.visibility === "partijen") return true;
  if (doc.visibility === me.side) {
    if (doc.partyId && !view.parties.some((p) => p.id === doc.partyId && p.side === me.side)) return false;
    return true;
  }
  return false;
}
