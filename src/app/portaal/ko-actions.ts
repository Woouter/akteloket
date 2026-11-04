"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth/session";
import { requireParty } from "@/lib/auth/guards";
import { loadDossierView, logEvent, updateDossier, updateParty } from "@/lib/domain/dossier";
import { runAutomations } from "@/lib/automation/engine";
import { saveDocument, readDocument } from "@/lib/integrations/storage";
import { isDemo } from "@/lib/config";
import { addDays, todayIso } from "@/lib/util/format";

function bedenktijdEinde(from: string): string {
  // drie dagen na de dag van terhandstelling; valt het einde in het weekend, dan de eerstvolgende werkdag (feestdagen: notaris controleert)
  let end = addDays(from, 3);
  const day = new Date(end + "T12:00:00").getDay();
  if (day === 6) end = addDays(end, 2);
  if (day === 0) end = addDays(end, 1);
  return end;
}

const back = (id: string, key: string) => { revalidatePath(`/portaal/${id}`, "layout"); redirect(`/portaal/${id}/stap/${key}`); };

export async function koApprove(dossierId: string) {
  const user = await getUser();
  if (!user || (!isDemo() && user.role === "klant")) throw new Error("Geen toegang");
  await updateDossier(dossierId, (d) => { if (d.koopovereenkomst) d.koopovereenkomst.status = "verzonden"; });
  await logEvent({ dossierId, actorType: user.role === "klant" ? "systeem" : "beheer", actorName: user.role === "klant" ? "Demo-simulatie" : user.name, type: "ko.gecontroleerd", message: "Concept-koopovereenkomst juridisch gecontroleerd en ter ondertekening klaargezet.", visibleTo: "partijen" });
  if (user.role === "beheer") { revalidatePath(`/beheer/dossiers/${dossierId}`); redirect(`/beheer/dossiers/${dossierId}`); }
  back(dossierId, "ondertekenen");
}

async function maybeComplete(dossierId: string) {
  const v = (await loadDossierView(dossierId))!;
  if (v.parties.every((p) => p.data.meta?.koGetekend)) {
    const today = todayIso();
    await updateDossier(dossierId, (d) => { d.koopovereenkomst = { ...(d.koopovereenkomst ?? { status: "verzonden" }), status: "bedenktijd", getekendOp: new Date().toISOString() }; d.transaction.datumOndertekening = today; d.transaction.bedenktijdEinde = bedenktijdEinde(addDays(today, 0)); });
    await logEvent({ dossierId, actorType: "systeem", type: "ko.getekend", message: "Koopovereenkomst door alle partijen getekend; bedenktijd koper loopt.", visibleTo: "partijen" });
  }
}

export async function koSign(dossierId: string, partyId: string) {
  const a = await requireParty(dossierId);
  const p = a.mine.find((x) => x.id === partyId && x.id === a.me.id);
  if (!p) throw new Error("Je kunt alleen voor jezelf tekenen");
  await updateParty(p.id, (d) => { d.meta = { ...(d.meta ?? {}), koGetekend: { source: "klant", confirmedBy: a.user.name, confirmedAt: new Date().toISOString() } }; });
  await logEvent({ dossierId, actorType: "klant", actor: a.user, type: "ko.handtekening", message: `${p.displayName} heeft de koopovereenkomst digitaal ondertekend.`, visibleTo: "partijen" });
  await maybeComplete(dossierId);
  back(dossierId, "ondertekenen");
}

export async function koSimOthers(dossierId: string) {
  if (!isDemo()) throw new Error("Alleen in demo");
  const a = await requireParty(dossierId);
  for (const p of a.view.parties.filter((x) => !x.data.meta?.koGetekend)) await updateParty(p.id, (d) => { d.meta = { ...(d.meta ?? {}), koGetekend: { source: "klant", confirmedBy: "Demo-simulatie", confirmedAt: new Date().toISOString() } }; });
  await logEvent({ dossierId, actorType: "systeem", actorName: "Demo-simulatie", type: "ko.handtekening", message: "Demo-simulatie: alle partijen hebben getekend.", visibleTo: "partijen" });
  await maybeComplete(dossierId);
  back(dossierId, "ondertekenen");
}

export async function koSimBedenktijd(dossierId: string) {
  if (!isDemo()) throw new Error("Alleen in demo");
  await requireParty(dossierId);
  await updateDossier(dossierId, (d) => { d.transaction.bedenktijdEinde = addDays(todayIso(), -1); });
  await runAutomations(dossierId, "demo");
  back(dossierId, "akte");
}

/** Zet het KO-dossier om naar een notarieel dossier — zonder iets opnieuw uit te vragen. */
export async function koToAkte(dossierId: string, fd: FormData) {
  const a = await requireParty(dossierId);
  const service = String(fd.get("service") ?? "beide") as "beide" | "levering";
  const ko = a.view.data.koopovereenkomst;
  if (ko?.documentId) {
    const doc = await readDocument(ko.documentId);
    if (doc) {
      const id = await saveDocument({ dossierId, kind: "koopovereenkomst", title: "Getekende koopovereenkomst", filename: doc.filename.replace("concept-", ""), mime: doc.mime, content: doc.content, source: "gegenereerd", visibility: "partijen", meta: { ir: (doc.meta as { ir?: unknown }).ir, getekendOp: ko.getekendOp } });
      await updateDossier(dossierId, (d) => { d.koDocumentId = id; });
    }
  }
  await updateDossier(dossierId, (d) => {
    d.service = service;
    d.koStatus = "verwerkt";
    d.extractie = { methode: "handmatig", op: new Date().toISOString(), ontbrekend: [], onzeker: [] };
    if (service === "beide") d.financing.hypotheek = "ja";
    return { status: "intake" };
  });
  const db = (await import("@/lib/db")).getDb;
  const { schema } = await import("@/lib/db");
  const { eq } = await import("drizzle-orm");
  await (await db()).update(schema.dossiers).set({ service }).where(eq(schema.dossiers.id, dossierId));
  await logEvent({ dossierId, actorType: "klant", actor: a.user, type: "ko.omgezet", message: `Dossier omgezet naar ${service === "beide" ? "levering + hypotheekakte" : "akte van levering"}; gegevens uit de koopovereenkomst zijn overgenomen.`, visibleTo: "partijen" });
  await runAutomations(dossierId, "omzetting");
  revalidatePath(`/portaal/${dossierId}`, "layout");
  redirect(`/portaal/${dossierId}?opgeslagen=1`);
}
