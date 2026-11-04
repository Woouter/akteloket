import { NextResponse } from "next/server";
import { currentDraft, toReviewPayload } from "@/lib/domain/aanvraag";
import { attachKoopovereenkomst } from "@/lib/domain/intake";
import { loadDossierView } from "@/lib/domain/dossier";
import { isDemo } from "@/lib/config";

export const maxDuration = 120;
const MAX = 25 * 1024 * 1024;
const ALLOWED = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

export async function POST(req: Request) {
  const draft = await currentDraft();
  if (!draft) return NextResponse.json({ error: "Je aanvraag is verlopen. Begin opnieuw." }, { status: 404 });
  let buf: Buffer, filename: string, mime: string;
  const ct = req.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) {
    const body = await req.json().catch(() => ({}));
    if (!body.demo || !isDemo()) return NextResponse.json({ error: "Geen bestand" }, { status: 400 });
    const { koopovereenkomstPdf } = await import("@/lib/demo/pdfs");
    buf = await koopovereenkomstPdf();
    filename = "voorbeeld-koopovereenkomst-bloesemlaan-14.pdf";
    mime = "application/pdf";
  } else {
    const fd = await req.formData();
    const file = fd.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Geen bestand ontvangen" }, { status: 400 });
    if (file.size > MAX) return NextResponse.json({ error: "Bestand is groter dan 25 MB" }, { status: 400 });
    mime = file.type || "application/pdf";
    if (!ALLOWED.includes(mime)) return NextResponse.json({ error: "Upload een PDF of foto (JPG/PNG)" }, { status: 400 });
    buf = Buffer.from(await file.arrayBuffer());
    filename = file.name.replace(/[^\w.\- ]+/g, "_").slice(0, 120) || "koopovereenkomst.pdf";
  }
  const scan = await attachKoopovereenkomst(draft.dossier.id, { buf, filename, mime });
  const view = (await loadDossierView(draft.dossier.id))!;
  return NextResponse.json({ scan: { method: scan.method, pages: scan.pages, missing: scan.missing, uncertain: scan.uncertain, warnings: scan.warnings, fileCheck: scan.fileCheck }, payload: toReviewPayload(view) });
}
