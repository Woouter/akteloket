import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth/session";
import { loadDossierView, logEvent, updateDossier, updateParty } from "@/lib/domain/dossier";
import { saveDocument } from "@/lib/integrations/storage";
import { attachKoopovereenkomst } from "@/lib/domain/intake";
import { runAutomations } from "@/lib/automation/engine";
import { getDb, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { safePath } from "@/lib/util/site";

export const maxDuration = 120;
const ALLOWED = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  const view = await loadDossierView(id);
  const me = view?.parties.find((p) => p.userId === user.id);
  if (!view || !me) return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  const fd = await req.formData();
  const file = fd.get("file");
  const kind = String(fd.get("kind") ?? "");
  const back = String(fd.get("back") ?? `/portaal/${id}`);
  if (!(file instanceof File) || file.size === 0) return NextResponse.json({ error: "Geen bestand" }, { status: 400 });
  if (file.size > 25 * 1024 * 1024) return NextResponse.json({ error: "Maximaal 25 MB" }, { status: 400 });
  const mime = file.type || "application/pdf";
  if (!ALLOWED.includes(mime)) return NextResponse.json({ error: "Upload een PDF of foto" }, { status: 400 });
  const buf = Buffer.from(await file.arrayBuffer());
  const filename = file.name.replace(/[^\w.\- ]+/g, "_").slice(0, 120);

  if (kind === "koopovereenkomst" && me.side === "koper") {
    await attachKoopovereenkomst(id, { buf, filename, mime }, user);
    await updateDossier(id, (d) => { if (d.koStatus === "ontvangen") d.koStatus = "verwerkt"; });
  } else if (kind === "wwft_bewijs" && me.side === "koper") {
    const bronId = String(fd.get("bronId") ?? "");
    const docId = await saveDocument({ dossierId: id, partyId: me.id, kind: "wwft_bewijs", title: String(fd.get("title") ?? "Bewijsstuk herkomst middelen"), filename, mime, content: buf, source: "upload", visibility: "koper", createdBy: user.id, meta: { bronId, documentType: fd.get("documentType") } });
    await updateDossier(id, (d) => { const b = d.wwft.bronnen.find((x) => x.id === bronId); if (b) b.documentIds.push(docId); });
    await logEvent({ dossierId: id, actorType: "klant", actor: user, type: "wwft.document", message: `Bewijsstuk geüpload: ${String(fd.get("documentType") ?? filename)}.` });
  } else if (kind === "aanvulling") {
    const requestId = String(fd.get("requestId") ?? "");
    const docId = await saveDocument({ dossierId: id, partyId: me.id, kind: "aanvulling", title: String(fd.get("title") ?? "Aanvullend document"), filename, mime, content: buf, source: "upload", visibility: me.side, createdBy: user.id, meta: { requestId } });
    const db = await getDb();
    await db.update(schema.requests).set({ status: "beantwoord", documentId: docId, answeredAt: new Date(), response: "Document aangeleverd" }).where(eq(schema.requests.id, requestId));
    await logEvent({ dossierId: id, actorType: "klant", actor: user, type: "verzoek.document", message: "Aanvullend document aangeleverd op verzoek van de notaris." });
  } else if (kind === "volmacht_verkoper" && me.side === "verkoper") {
    const partyId = String(fd.get("partyId") ?? me.id);
    const target = view.parties.find((p) => p.id === partyId && p.side === "verkoper") ?? me;
    const docId = await saveDocument({ dossierId: id, partyId: target.id, kind: "volmacht_verkoper", title: `Gelegaliseerde verkoopvolmacht ${target.displayName}`, filename, mime, content: buf, source: "upload", visibility: "verkoper", createdBy: user.id });
    await updateParty(target.id, (d) => { d.volmacht = { ...(d.volmacht ?? { status: "te_plannen" }), status: "ondertekend", legalisatie: "afgerond", ondertekendOp: new Date().toISOString(), ontvangenOp: new Date().toISOString(), documentId: docId, ondertekeningMethode: "kantoor" }; });
    await logEvent({ dossierId: id, actorType: "klant", actor: user, type: "volmacht.gelegaliseerd", message: `Gelegaliseerde verkoopvolmacht van ${target.displayName} ontvangen.`, visibleTo: "verkoper" });
  } else if (kind === "huwelijkse_voorwaarden") {
    await saveDocument({ dossierId: id, partyId: me.id, kind: "huwelijkse_voorwaarden", filename, mime, content: buf, source: "upload", visibility: me.side, createdBy: user.id });
  } else {
    return NextResponse.json({ error: "Onbekend documenttype" }, { status: 400 });
  }
  await runAutomations(id, "upload");
  const accept = req.headers.get("accept") ?? "";
  if (accept.includes("application/json")) return NextResponse.json({ ok: true });
  return NextResponse.redirect(new URL(safePath(back, `/portaal/${id}`), req.url), 303);
}
