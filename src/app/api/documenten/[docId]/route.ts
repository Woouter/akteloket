import { getUser } from "@/lib/auth/session";
import { readDocument } from "@/lib/integrations/storage";
import { loadDossierView, logEvent } from "@/lib/domain/dossier";
import { canSeeDocument } from "@/lib/auth/documents";

export async function GET(req: Request, { params }: { params: Promise<{ docId: string }> }) {
  const user = await getUser();
  if (!user) return new Response("Niet ingelogd", { status: 401 });
  const doc = await readDocument((await params).docId);
  if (!doc) return new Response("Niet gevonden", { status: 404 });
  const view = await loadDossierView(doc.dossierId);
  if (!view || !canSeeDocument(user, view, doc)) return new Response("Geen toegang", { status: 403 });
  const inline = new URL(req.url).searchParams.get("inline") === "1";
  if (user.role !== "klant") await logEvent({ dossierId: doc.dossierId, actorType: user.role === "notaris" ? "notaris" : "beheer", actor: user, type: "document.geopend", message: `Document "${doc.title}" geopend door ${user.name}.` });
  return new Response(new Uint8Array(doc.content), { headers: { "content-type": doc.mime, "content-disposition": `${inline ? "inline" : "attachment"}; filename="${encodeURIComponent(doc.filename)}"`, "cache-control": "private, no-store" } });
}
