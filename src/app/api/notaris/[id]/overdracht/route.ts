import JSZip from "jszip";
import { getUser } from "@/lib/auth/session";
import { loadDossierView, logEvent } from "@/lib/domain/dossier";
import { readDocument } from "@/lib/integrations/storage";
import { buildManifest } from "@/lib/automation/engine";
import { DOCUMENT_KINDS } from "@/lib/domain/types";

/** Complete dossieroverdracht als ZIP: alle documenten + manifest + gestructureerde gegevens. */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getUser();
  if (!user || (user.role !== "notaris" && user.role !== "beheer")) return new Response("Geen toegang", { status: 403 });
  const view = await loadDossierView(id);
  if (!view) return new Response("Niet gevonden", { status: 404 });
  const zip = new JSZip();
  const folders: Record<string, string> = { koopovereenkomst: "01 Koopovereenkomst", dvo: "02 Dienstverleningsovereenkomst", kadaster_eigendom: "03 Kadaster", kadaster_kaart: "03 Kadaster", kadaster_akte: "03 Kadaster", concept_leveringsakte: "04 Concept-akten", concept_hypotheekakte: "04 Concept-akten", bankinstructie: "05 Financiering", volmacht_koper: "06 Volmachten", volmacht_verkoper: "06 Volmachten", verklaring_starters: "07 Overdrachtsbelasting", wwft_bewijs: "08 Wwft (vertrouwelijk)", aflosnota: "09 Verkoper - aflosnota's", aflosnota_verzoek: "09 Verkoper - aflosnota's", nota_koper: "10 Nota's van afrekening", nota_verkoper: "10 Nota's van afrekening" };
  for (const d of view.documents) {
    if (user.role === "beheer" && d.kind === "wwft_bewijs") continue;
    const doc = await readDocument(d.id);
    if (doc) zip.file(`${folders[d.kind] ?? "99 Overig"}/${d.filename}`, doc.content);
  }
  const manifest = buildManifest(view);
  zip.file("00 Overzicht/manifest.json", JSON.stringify({ dossier: view.dossier.reference, gegenereerd: new Date().toISOString(), ...manifest, overdrachten: view.handovers.map((h) => ({ versie: h.version, reden: h.reason, op: h.createdAt })) }, null, 2));
  zip.file("00 Overzicht/dossiergegevens.json", JSON.stringify({ object: view.data.property, transactie: view.data.transaction, financiering: { ...view.data.financing }, kadaster: { ...view.data.kadaster, documenten: undefined }, partijen: view.parties.map((p) => ({ zijde: p.side, naam: p.displayName, persoon: p.data.person, eigendom: p.data.eigendom, identificatie: p.data.idcheck, pep: p.data.pep, volmacht: p.data.volmacht, starters: p.data.starters })), wwft: user.role === "notaris" ? view.data.wwft : "alleen zichtbaar voor notaris", aandachtspunten: view.data.aandachtspunten }, null, 2));
  zip.file("00 Overzicht/inhoud.txt", [`Dossieroverdracht ${view.dossier.reference}`, "", ...manifest.items.map((i) => `- ${i.label}: ${i.status}`), "", "Open punten:", ...manifest.openPunten.map((p) => `- ${p}`), "", "Documenten:", ...view.documents.map((d) => `- [${DOCUMENT_KINDS[d.kind]}] ${d.filename}`)].join("\n"));
  const buf = Buffer.from(await zip.generateAsync({ type: "uint8array" }));
  await logEvent({ dossierId: id, actorType: user.role === "notaris" ? "notaris" : "beheer", actor: user, type: "overdracht.download", message: "Dossieroverdracht (ZIP) gedownload." });
  return new Response(new Uint8Array(buf), { headers: { "content-type": "application/zip", "content-disposition": `attachment; filename="dossieroverdracht-${view.dossier.reference}.zip"` } });
}
