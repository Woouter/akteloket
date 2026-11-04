import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth/session";
import { saveDocument } from "@/lib/integrations/storage";
import { scanBankinstructie } from "@/lib/extraction/bankinstructie";
import { logEvent, updateDossier } from "@/lib/domain/dossier";
import { runAutomations } from "@/lib/automation/engine";

export const maxDuration = 120;

/** De notaris deelt de rechtstreeks ontvangen hypotheekinstructie veilig met het platform. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getUser();
  if (!user || user.role !== "notaris") return NextResponse.json({ error: "Alleen de notaris kan een bankinstructie delen" }, { status: 403 });
  const fd = await req.formData();
  const file = fd.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Geen bestand" }, { status: 400 });
  const buf = Buffer.from(await file.arrayBuffer());
  const docId = await saveDocument({ dossierId: id, kind: "bankinstructie", filename: file.name, mime: file.type || "application/pdf", content: buf, source: "notaris", visibility: "intern", createdBy: user.id, replaceKind: true });
  const bi = await scanBankinstructie(buf);
  await updateDossier(id, (d) => { d.financing.bankinstructie = { ...bi.data, ontvangenOp: new Date().toISOString(), documentId: docId }; d.financing.bankinstructieStatus = "ontvangen"; if (d.akteHypotheek) d.akteHypotheek.inputHash = undefined; });
  await logEvent({ dossierId: id, actorType: "notaris", actor: user, type: "bank.gedeeld", message: `Hypotheekinstructie ${bi.data.geldverstrekker ?? ""} veilig gedeeld en uitgelezen (${bi.method === "ai" ? "AI" : "regelgebaseerd"}).`, visibleTo: "koper" });
  await runAutomations(id, "bankinstructie");
  return NextResponse.redirect(new URL(`/notaris/dossiers/${id}#hypotheekakte`, req.url), 303);
}
