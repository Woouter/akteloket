import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getUser } from "@/lib/auth/session";
import { getDb, schema } from "@/lib/db";
import { saveDocument } from "@/lib/integrations/storage";
import { logEvent } from "@/lib/domain/dossier";
import { runAutomations } from "@/lib/automation/engine";
import { parseEuro } from "@/lib/util/format";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getUser();
  if (!user || user.role !== "notaris") return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  const fd = await req.formData();
  const payoffId = String(fd.get("payoffId") ?? "");
  const amount = parseEuro(String(fd.get("amount") ?? ""));
  const file = fd.get("file");
  let docId: string | null = null;
  if (file instanceof File && file.size) docId = await saveDocument({ dossierId: id, kind: "aflosnota", filename: file.name, mime: file.type || "application/pdf", content: Buffer.from(await file.arrayBuffer()), source: "geldverstrekker", visibility: "intern", createdBy: user.id });
  const db = await getDb();
  await db.update(schema.payoffs).set({ status: "ontvangen", amount: amount ? Math.round(amount * 100) : null, validUntil: String(fd.get("validUntil") ?? "") || null, documentId: docId, receivedAt: new Date() }).where(eq(schema.payoffs.id, payoffId));
  await logEvent({ dossierId: id, actorType: "notaris", actor: user, type: "aflosnota.ontvangen", message: `Aflosnota geregistreerd${amount ? ` (€ ${amount.toLocaleString("nl-NL")})` : ""}.`, visibleTo: "verkoper" });
  await runAutomations(id, "aflosnota");
  return NextResponse.redirect(new URL(`/notaris/dossiers/${id}#aflosnotas`, req.url), 303);
}
