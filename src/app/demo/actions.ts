"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { isDemo, NOTARY_OFFICE } from "@/lib/config";
import { getDb, schema } from "@/lib/db";
import { loadDossierView, logEvent, updateDossier, updateParty } from "@/lib/domain/dossier";
import { runAutomations, runCron } from "@/lib/automation/engine";
import { saveDocument } from "@/lib/integrations/storage";
import { scanBankinstructie } from "@/lib/extraction/bankinstructie";
import { aflosnotaPdf, bankafschriftPdf, bankinstructiePdf } from "@/lib/demo/pdfs";
import { addDays, personName, propertyLine, todayIso } from "@/lib/util/format";
import { uid } from "@/lib/util/ids";
import { getUser } from "@/lib/auth/session";

async function guard() {
  if (!isDemo()) throw new Error("Alleen beschikbaar in de demo-omgeving");
}
const sim = (dossierId: string, message: string) => logEvent({ dossierId, actorType: "systeem", actorName: "Demo-simulatie", type: "demo.simulatie", message: `Demo-simulatie: ${message}` });
async function finish(dossierId: string, back: string) {
  await runAutomations(dossierId, "demo");
  revalidatePath("/", "layout");
  redirect(back);
}

export async function simKoperKlaar(dossierId: string, back: string) {
  await guard();
  const v = (await loadDossierView(dossierId))!;
  for (const p of v.kopers) await updateParty(p.id, (d) => {
    d.person = { nationaliteit: "Nederlandse", burgerlijkeStaat: "ongehuwd", geboorteplaats: "Utrecht", adres: "Demoweg 1", postcode: "3500 AA", woonplaats: "Utrecht", geboortedatum: "1994-05-05", ...d.person };
    d.gegevensBevestigd = true; d.pep = { antwoord: "nee" };
    d.eigendom = { aandeel: `1/${v.kopers.length}`, verhouding: "gelijk", ...(d.eigendom ?? {}) };
    d.idcheck = { status: "voltooid", methode: "idin", provider: "iDIN (demo)", voltooidOp: new Date().toISOString(), resultaat: { naam: personName(d.person), geboortedatum: d.person.geboortedatum ?? "", documentType: "iDIN-bankidentificatie" }, match: { naam: true, geboortedatum: true } };
    if (d.volmacht?.status === "te_plannen" || d.volmacht?.status === "gepland") d.volmacht = { ...d.volmacht, status: "ondertekend", ondertekendOp: new Date().toISOString(), ondertekeningMethode: "video" };
    if (d.starters?.preselectie === "mogelijk" && !d.starters.uitkomst) d.starters = { ...d.starters, hoofdverblijf: "ja", eerderGebruikt: "nee", wilGebruiken: "ja", uitkomst: "vrijstelling", verklaringGetekendOp: new Date().toISOString() };
  });
  const doc = await saveDocument({ dossierId, kind: "wwft_bewijs", title: "Rekeningafschrift (demo)", filename: "afschrift-demo.pdf", mime: "application/pdf", content: await bankafschriftPdf(), source: "upload", visibility: "koper", meta: { documentType: "Rekeningafschrift(en) waarop saldo en rekeninghouder zichtbaar zijn" } });
  await updateDossier(dossierId, (d) => {
    d.financing = { ...d.financing, hypotheek: d.financing.hypotheek ?? "ja", status: "rond", eigenMiddelen: "ja", bevestigd: true, geldverstrekker: d.financing.geldverstrekker ?? "Demo Hypotheekbank N.V. (fictief)" };
    d.koperIban = d.koperIban.bevestigd ? d.koperIban : { iban: "NL91ABNA0417164300", tenaamstelling: v.kopers.map((k) => k.displayName).join(" en "), bevestigd: true };
    if (!d.wwft.ingediendOp) d.wwft = { status: "aangeleverd", ingediendOp: new Date().toISOString(), bronnen: [{ id: uid(), type: "spaargeld", bedrag: 40000, beschikbaar: "helemaal", rekening: "eigen", eigenaarGeld: "mij", overgemaakt: "ja", details: { opbouw: "Loon of regulier inkomen" }, documentIds: [doc] }] };
    if (d.koStatus === "ontvangen") d.koStatus = "verwerkt";
  });
  await sim(dossierId, "koper(s) hebben alle stappen afgerond.");
  await finish(dossierId, back);
}

export async function simVerkoperKlaar(dossierId: string, back: string) {
  await guard();
  const v = (await loadDossierView(dossierId))!;
  const db = await getDb();
  for (const p of v.verkopers) {
    await db.update(schema.parties).set({ activatedAt: p.activatedAt ?? new Date(), invitedAt: p.invitedAt ?? new Date() }).where(eq(schema.parties.id, p.id));
    await updateParty(p.id, (d) => {
      d.person = { nationaliteit: "Nederlandse", burgerlijkeStaat: "gehuwd", geboorteplaats: "Amersfoort", geboortedatum: "1965-03-03", adres: propertyLine(v.data.property).split(",")[0], ...d.person };
      d.gegevensBevestigd = true;
      d.idcheck = { status: "voltooid", methode: "idin", provider: "iDIN (demo)", voltooidOp: new Date().toISOString(), resultaat: { naam: personName(d.person), geboortedatum: d.person.geboortedatum ?? "" }, match: { naam: true, geboortedatum: true } };
      d.iban = d.iban?.bevestigd ? d.iban : { iban: "NL20INGB0001234567", tenaamstelling: p.displayName, bevestigd: true };
      d.volmacht = { ...(d.volmacht ?? { status: "te_plannen" }), status: "ondertekend", ondertekendOp: new Date().toISOString(), legalisatie: "niet_vereist", ontvangenOp: new Date().toISOString(), ondertekeningMethode: "video" };
      d.meta = { ...(d.meta ?? {}), zekerhedenBevestigd: { source: "klant" } };
    });
  }
  for (const po of v.payoffs) await db.update(schema.payoffs).set({ toestemmingVerkoper: true, loanNumbers: po.loanNumbers ?? "1234 5678 90" }).where(eq(schema.payoffs.id, po.id));
  await sim(dossierId, "verkoper(s) hebben alle stappen afgerond.");
  await finish(dossierId, back);
}

export async function simBankinstructie(dossierId: string, back: string) {
  await guard();
  const v = (await loadDossierView(dossierId))!;
  const d = v.data;
  const hoofdsom = d.financing.hypotheekbedragIndicatie ?? d.transaction.financieringsvoorbehoud?.bedrag ?? Math.round((d.transaction.koopprijs ?? 400000) * 0.9 / 1000) * 1000;
  const pdf = await bankinstructiePdf({
    geldverstrekker: d.financing.geldverstrekker && !/noorderlicht/i.test(d.financing.geldverstrekker) ? d.financing.geldverstrekker : "Noorderlicht Hypotheken N.V. (fictief)",
    kenmerk: `NLH-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 899999)}`,
    notaris: `${NOTARY_OFFICE.notaryShort}, notaris te ${NOTARY_OFFICE.city}`,
    geldnemers: v.kopers.map((k) => ({ naam: personName(k.data.person), geboortedatum: k.data.person.geboortedatum })),
    onderpand: `${propertyLine(d.property)}${d.property.kadastraal?.perceel ? `, kadastraal ${d.property.kadastraal.gemeente} ${d.property.kadastraal.sectie} ${d.property.kadastraal.perceel}` : ""}`,
    hoofdsom, inschrijving: Math.round(hoofdsom * 1.25), leningdelen: [{ soort: "Annuïteitenlening, 30 jaar vast", bedrag: hoofdsom }],
    voorwaarden: "Algemene Voorwaarden voor Hypothecaire Geldleningen Noorderlicht Hypotheken 2025 (fictief)", passeerdatum: d.transaction.leveringsdatum,
  });
  const docId = await saveDocument({ dossierId, kind: "bankinstructie", filename: "hypotheekinstructie.pdf", mime: "application/pdf", content: pdf, source: "notaris", visibility: "intern", replaceKind: true });
  const bi = await scanBankinstructie(pdf);
  await updateDossier(dossierId, (x) => { x.financing.bankinstructie = { ...bi.data, ontvangenOp: new Date().toISOString(), documentId: docId }; x.financing.bankinstructieStatus = "ontvangen"; x.akteHypotheek = undefined; });
  await sim(dossierId, "hypotheekinstructie ontvangen van de geldverstrekker en veilig gedeeld door de notaris.");
  await finish(dossierId, back);
}

export async function simAflosnota(dossierId: string, back: string) {
  await guard();
  const v = (await loadDossierView(dossierId))!;
  const db = await getDb();
  const pdf = await aflosnotaPdf();
  for (const p of v.payoffs.filter((x) => x.status === "op_te_vragen" || x.status === "aangevraagd")) {
    const docId = await saveDocument({ dossierId, kind: "aflosnota", filename: `aflosnota-${p.lender.split(" ")[0].toLowerCase()}.pdf`, mime: "application/pdf", content: pdf, source: "geldverstrekker", visibility: "intern" });
    const amount = p.amount ?? Math.round((v.data.transaction.koopprijs ?? 400000) * 0.42 * 100);
    await db.update(schema.payoffs).set({ status: "ontvangen", amount, documentId: docId, validUntil: v.data.transaction.leveringsdatum, requestedAt: p.requestedAt ?? new Date(), receivedAt: new Date(), toestemmingVerkoper: true }).where(eq(schema.payoffs.id, p.id));
  }
  await sim(dossierId, "aflosnota('s) ontvangen van de geldverstrekker(s) van de verkoper.");
  await finish(dossierId, back);
}

export async function simVolmachtAfgerond(dossierId: string, back: string) {
  await guard();
  const v = (await loadDossierView(dossierId))!;
  const db = await getDb();
  for (const a of v.appointments.filter((x) => x.status === "gepland")) await db.update(schema.appointments).set({ status: "afgerond" }).where(eq(schema.appointments.id, a.id));
  for (const p of v.parties.filter((x) => x.data.volmacht?.status === "gepland" || x.data.volmacht?.status === "te_plannen")) await updateParty(p.id, (d) => { d.volmacht = { ...(d.volmacht ?? { status: "te_plannen" }), status: "ondertekend", ondertekendOp: new Date().toISOString(), ondertekeningMethode: "video" }; });
  await sim(dossierId, "volmachtafspraken afgerond en volmachten ondertekend.");
  await finish(dossierId, back);
}

export async function simDatum14(dossierId: string, back: string) {
  await guard();
  await updateDossier(dossierId, (d) => { d.transaction.leveringsdatum = addDays(todayIso(), 14); d.transaction.leveringsdatumStatus = "voorlopig"; d.datumCheck = {}; });
  await sim(dossierId, "tijd vooruitgespoeld tot 14 dagen vóór de overdracht.");
  await finish(dossierId, back);
}

export async function simCron(back: string) {
  await guard();
  await runCron();
  revalidatePath("/", "layout");
  redirect(back);
}

export async function resetDemoAction() {
  await guard();
  const { resetDemo } = await import("@/lib/demo/seed");
  const { withSeeding } = await import("@/lib/db");
  await withSeeding(() => resetDemo());
  revalidatePath("/", "layout");
  redirect("/demo?reset=1");
}

export async function saveFeedback(fd: FormData) {
  await guard();
  const user = await getUser();
  const db = await getDb();
  const component = String(fd.get("component") ?? "");
  const verdict = String(fd.get("verdict") ?? "akkoord") as "akkoord" | "aanpassen" | "schrappen" | "toevoegen";
  await db.insert(schema.feedback).values({ id: uid(), component, verdict, comment: String(fd.get("comment") ?? ""), author: user?.name ?? String(fd.get("author") ?? "Bezoeker") });
  revalidatePath("/demo/validatie");
  redirect(`/demo/validatie?opgeslagen=${encodeURIComponent(component)}#${encodeURIComponent(component)}`);
}
