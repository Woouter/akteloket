import { currentDraft } from "@/lib/domain/aanvraag";
import { readDocument } from "@/lib/integrations/storage";

export async function GET() {
  const draft = await currentDraft();
  if (!draft?.data.koDocumentId) return new Response("Niet gevonden", { status: 404 });
  const doc = await readDocument(draft.data.koDocumentId);
  if (!doc) return new Response("Niet gevonden", { status: 404 });
  return new Response(new Uint8Array(doc.content), { headers: { "content-type": doc.mime, "content-disposition": `inline; filename="${doc.filename}"`, "cache-control": "private, no-store" } });
}
