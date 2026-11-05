import "server-only";
import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { emptyDossierData, emptyPartyData, logEvent, updateDossier } from "./dossier";
import type { DossierData, FieldMeta, PartyData, PersonData, Side } from "./types";
import type { ServiceKey } from "@/lib/config";
import { DVO_VERSION } from "@/lib/config";
import { dossierReference, sha256, uid } from "@/lib/util/ids";
import { saveDocument } from "@/lib/integrations/storage";
import { scanKoopovereenkomst, type KoExtraction, type ScanResult } from "@/lib/extraction/koopovereenkomst";
import { dvoPlainText } from "@/lib/docgen/dvo";
import { dvoPdf } from "./dvo-pdf";
import { personName } from "@/lib/util/format";

export async function createConceptDossier(service: ServiceKey, draftToken: string, isDemo = false): Promise<string> {
  const db = await getDb();
  const id = uid();
  let reference = dossierReference();
  for (let i = 0; i < 5; i++) {
    const exists = await db.select({ id: schema.dossiers.id }).from(schema.dossiers).where(eq(schema.dossiers.reference, reference)).limit(1);
    if (!exists.length) break;
    reference = dossierReference();
  }
  await db.insert(schema.dossiers).values({ id, reference, status: "concept", service, data: emptyDossierData(service), draftToken: sha256(draftToken), isDemo });
  return id;
}

export async function findConceptByDraft(draftToken: string) {
  const db = await getDb();
  const [d] = await db.select().from(schema.dossiers).where(and(eq(schema.dossiers.draftToken, sha256(draftToken)), eq(schema.dossiers.status, "concept"))).limit(1);
  return d ?? null;
}

const toPerson = (p: KoExtraction["kopers"][number]): PersonData => ({
  voornamen: p.voornamen ?? undefined,
  achternaam: p.achternaam ?? undefined,
  roepnaam: p.voornamen?.split(" ")[0],
  geboortedatum: p.geboortedatum ?? undefined,
  geboorteplaats: p.geboorteplaats ?? undefined,
  adres: p.adres ?? undefined,
  postcode: p.postcode ?? undefined,
  woonplaats: p.woonplaats ?? undefined,
  burgerlijkeStaat: p.burgerlijkeStaat ?? undefined,
  heeftPartner: p.burgerlijkeStaat === "gehuwd" || p.burgerlijkeStaat === "geregistreerd_partner" ? "ja" : p.burgerlijkeStaat ? "nee" : undefined,
  partnerNaam: p.partnerNaam ?? undefined,
});

/** Slaat de KO op, leest hem uit en vult dossier + partijen. */
export async function attachKoopovereenkomst(dossierId: string, file: { buf: Buffer; filename: string; mime: string }, actor?: { id: string; name: string } | null): Promise<ScanResult> {
  const docId = await saveDocument({ dossierId, kind: "koopovereenkomst", filename: file.filename, mime: file.mime, content: file.buf, source: "upload", visibility: "partijen", createdBy: actor?.id, replaceKind: true });
  const scan = await scanKoopovereenkomst(file.buf, file.mime);
  await applyExtraction(dossierId, scan, docId);
  await logEvent({ dossierId, actorType: actor ? "klant" : "systeem", actor, type: "ko.uitgelezen", message: `Koopovereenkomst uitgelezen (${scan.method === "ai" ? "AI" : "regelgebaseerd"}): ${scan.pages} pagina's, ${scan.missing.length} ontbrekend, ${scan.uncertain.length} onzeker.`, data: { missing: scan.missing, uncertain: scan.uncertain, warnings: scan.warnings } });
  return scan;
}

export async function applyExtraction(dossierId: string, scan: ScanResult, docId: string) {
  const x = scan.extraction;
  const db = await getDb();
  const meta: Record<string, FieldMeta> = {};
  for (const b of x.bronnen) meta[b.veld] = { source: "koopovereenkomst", page: b.pagina ?? undefined, confidence: b.zekerheid, snippet: b.citaat };
  await updateDossier(dossierId, (d) => {
    d.koDocumentId = docId;
    d.koStatus = scan.warnings.length && !x.koopprijs ? "verwerking_nodig" : "ontvangen";
    d.extractie = { methode: scan.method, op: new Date().toISOString(), ontbrekend: scan.missing, onzeker: scan.uncertain };
    d.property = {
      ...d.property,
      straat: x.object.straat ?? d.property.straat,
      huisnummer: x.object.huisnummer ?? d.property.huisnummer,
      toevoeging: x.object.toevoeging ?? d.property.toevoeging,
      postcode: x.object.postcode ?? d.property.postcode,
      plaats: x.object.plaats ?? d.property.plaats,
      soort: x.object.soort ?? d.property.soort,
      omschrijving: x.object.omschrijving ?? d.property.omschrijving,
      kadastraal: x.object.perceel ? { gemeente: x.object.kadastraleGemeente ?? undefined, sectie: x.object.sectie ?? undefined, perceel: x.object.perceel, appartementsindex: x.object.appartementsindex ?? undefined, grootte: x.object.grootte ?? undefined } : d.property.kadastraal,
    };
    d.transaction = {
      ...d.transaction,
      koopprijs: x.koopprijs ?? d.transaction.koopprijs,
      roerendeZaken: x.roerendeZaken ?? d.transaction.roerendeZaken,
      datumOndertekening: x.datumOndertekening ?? d.transaction.datumOndertekening,
      leveringsdatumOrigineel: x.leveringsdatum ?? d.transaction.leveringsdatumOrigineel,
      leveringsdatum: x.leveringsdatum ?? d.transaction.leveringsdatum,
      leveringsdatumStatus: x.leveringsdatum ? "voorlopig" : "nog_te_bepalen",
      waarborgsom: { bedrag: x.waarborgsom.bedrag ?? undefined, type: x.waarborgsom.type ?? undefined, uiterlijk: x.waarborgsom.uiterlijk ?? undefined },
      financieringsvoorbehoud: { bedrag: x.financieringsvoorbehoud.bedrag ?? undefined, datum: x.financieringsvoorbehoud.datum ?? undefined, nhg: x.financieringsvoorbehoud.nhg ?? undefined },
      overigeVoorbehouden: x.overigeVoorbehouden.map((v) => ({ omschrijving: v.omschrijving, datum: v.datum ?? undefined })),
      bijzondereBepalingen: x.bijzondereBepalingen.map((b) => ({ titel: b.titel, tekst: b.tekst, page: b.pagina ?? undefined })),
      notarisInKo: x.notaris ?? undefined,
      bedenktijdEinde: x.bedenktijdEinde ?? undefined,
      makelaarVerkoper: x.makelaarVerkoper ?? undefined,
      makelaarKoper: x.makelaarKoper ?? undefined,
    };
    if (x.financieringsvoorbehoud.bedrag) d.financing.hypotheekbedragIndicatie = x.financieringsvoorbehoud.bedrag;
    d.meta = { ...d.meta, ...meta };
    const notaris = (x.notaris ?? "").toLowerCase();
    if (x.notaris && !/van dam/.test(notaris)) d.aandachtspunten.push({ id: uid(), tekst: `In de koopovereenkomst is een andere notaris genoemd (${x.notaris}). Notariskeuze bevestigen met koper en verkoper.`, ernst: "let_op", bron: "Koopovereenkomst" });
    for (const b of x.bijzondereBepalingen) d.aandachtspunten.push({ id: uid(), tekst: `Bijzondere bepaling: ${b.titel}`, ernst: "info", bron: `Koopovereenkomst${b.pagina ? ` p. ${b.pagina}` : ""}` });
  });
  // Partijen vervangen (alleen in conceptfase of als er nog geen gekoppelde gebruikers zijn)
  const existing = await db.select().from(schema.parties).where(eq(schema.parties.dossierId, dossierId));
  const linked = existing.some((p) => p.userId && p.side === "verkoper");
  const replaceSides: Side[] = linked ? ["koper"] : ["koper", "verkoper"];
  const keepKoperUsers = existing.filter((p) => p.side === "koper" && p.userId);
  for (const p of existing.filter((p) => replaceSides.includes(p.side) && !p.userId)) await db.delete(schema.parties).where(eq(schema.parties.id, p.id));
  const insert = async (side: Side, list: KoExtraction["kopers"]) => {
    for (const [i, person] of list.entries()) {
      const data: PartyData = { ...emptyPartyData(), person: toPerson(person), eigendom: side === "koper" && list.length > 1 ? { alleenOfSamen: list.length === 2 ? "een_ander" : "meerdere", verhouding: x.eigendomsverhoudingKopers ? (/1\/2|helft/.test(x.eigendomsverhoudingKopers) && list.length === 2 ? "gelijk" : "anders") : undefined, aandeel: x.eigendomsverhoudingKopers && /1\/2|helft/.test(x.eigendomsverhoudingKopers) ? "1/2" : undefined } : { alleenOfSamen: list.length > 1 ? "een_ander" : "alleen" } };
      data.meta = Object.fromEntries(Object.entries(meta).filter(([k]) => k.startsWith(`${side === "koper" ? "kopers" : "verkopers"}.${i}.`)).map(([k, v]) => [k.split(".").slice(2).join("."), v]));
      const match = side === "koper" ? keepKoperUsers.find((k) => personName(k.data.person).toLowerCase() === personName(data.person).toLowerCase()) : undefined;
      if (match) {
        await db.update(schema.parties).set({ data: { ...match.data, person: { ...data.person, ...match.data.person }, meta: data.meta } }).where(eq(schema.parties.id, match.id));
        continue;
      }
      await db.insert(schema.parties).values({ id: uid(), dossierId, side, isPrimary: i === 0, position: i, email: person.email ?? null, phone: person.telefoon ?? null, displayName: personName(data.person) || `${side === "koper" ? "Koper" : "Verkoper"} ${i + 1}`, data });
    }
  };
  if (replaceSides.includes("koper")) await insert("koper", x.kopers);
  if (replaceSides.includes("verkoper")) await insert("verkoper", x.verkopers);
}

export interface ReviewModel {
  property: DossierData["property"];
  transaction: Pick<DossierData["transaction"], "koopprijs" | "roerendeZaken" | "leveringsdatum" | "datumOndertekening"> & { waarborgsomBedrag?: number };
  parties: { id?: string; side: Side; person: PersonData; email?: string }[];
}

/** Verwerkt controle/aanvulling door de klant; legt wijzigingen t.o.v. de extractie vast. */
export async function applyReview(dossierId: string, model: ReviewModel, actorName: string) {
  const db = await getDb();
  await updateDossier(dossierId, (d) => {
    const before = JSON.stringify({ p: d.property, t: d.transaction });
    d.property = { ...d.property, ...model.property, kadastraal: { ...d.property.kadastraal, ...model.property.kadastraal } };
    d.transaction = { ...d.transaction, koopprijs: model.transaction.koopprijs, roerendeZaken: model.transaction.roerendeZaken, datumOndertekening: model.transaction.datumOndertekening, leveringsdatum: model.transaction.leveringsdatum, leveringsdatumOrigineel: d.transaction.leveringsdatumOrigineel ?? model.transaction.leveringsdatum, leveringsdatumStatus: model.transaction.leveringsdatum ? d.transaction.leveringsdatumStatus ?? "voorlopig" : "nog_te_bepalen" };
    if (model.transaction.waarborgsomBedrag != null) d.transaction.waarborgsom = { ...d.transaction.waarborgsom, bedrag: model.transaction.waarborgsomBedrag };
    if (before !== JSON.stringify({ p: d.property, t: d.transaction })) d.meta["review"] = { source: "klant", confirmedBy: actorName, confirmedAt: new Date().toISOString() };
    if (d.koStatus === "ontvangen") d.koStatus = "verwerkt";
  });
  const existing = await db.select().from(schema.parties).where(eq(schema.parties.dossierId, dossierId));
  const keep = new Set<string>();
  for (const [i, p] of model.parties.entries()) {
    const row = p.id ? existing.find((e) => e.id === p.id) : undefined;
    const name = personName(p.person) || `${p.side === "koper" ? "Koper" : "Verkoper"}`;
    if (row) {
      keep.add(row.id);
      const changed = Object.entries(p.person).filter(([k, v]) => (row.data.person as Record<string, unknown>)[k] !== v && v !== undefined).map(([k]) => k);
      const meta = { ...(row.data.meta ?? {}) };
      for (const k of changed) meta[k] = { ...(meta[k] ?? { source: "klant" }), source: "klant", changedFrom: String((row.data.person as Record<string, unknown>)[k] ?? ""), confirmedBy: actorName, confirmedAt: new Date().toISOString() };
      await db.update(schema.parties).set({ data: { ...row.data, person: { ...row.data.person, ...p.person }, meta }, displayName: name, email: p.email ?? row.email }).where(eq(schema.parties.id, row.id));
    } else {
      const id = uid();
      keep.add(id);
      await db.insert(schema.parties).values({ id, dossierId, side: p.side, isPrimary: !existing.some((e) => e.side === p.side) && model.parties.filter((x) => x.side === p.side)[0] === p, position: i, email: p.email ?? null, displayName: name, data: { ...emptyPartyData(), person: p.person, meta: Object.fromEntries(Object.keys(p.person).map((k) => [k, { source: "klant" as const }])) } });
    }
  }
  for (const e of existing) if (!keep.has(e.id) && !e.userId) await db.delete(schema.parties).where(eq(schema.parties.id, e.id));
}

/** Rondt de aanvraag af: account, DVO-akkoord (versie, tijd, hash), status en sessie. */
export async function finalizeAanvraag(dossierId: string, input: {
  name: string; email: string; phone: string; rol: "koper" | "mede_koper" | "vertegenwoordiger"; adres?: string;
  signatureName: string; checks: string[]; ip?: string; userAgent?: string; hasKo: boolean;
}) {
  const db = await getDb();
  const { findOrCreateUser } = await import("@/lib/auth/users");
  const user = await findOrCreateUser(input.email, input.name, "klant", input.phone);
  const parties = await db.select().from(schema.parties).where(eq(schema.parties.dossierId, dossierId));
  const kopers = parties.filter((p) => p.side === "koper");
  const nameLc = input.name.trim().toLowerCase();
  let me = kopers.find((k) => personName(k.data.person).toLowerCase() === nameLc) ?? kopers.find((k) => k.data.person.achternaam && nameLc.includes(k.data.person.achternaam.toLowerCase())) ?? (input.rol === "vertegenwoordiger" ? undefined : kopers[0]);
  if (!me && input.rol !== "vertegenwoordiger") {
    const [first, ...rest] = input.name.trim().split(/\s+/);
    const id = uid();
    await db.insert(schema.parties).values({ id, dossierId, side: "koper", isPrimary: true, position: 0, email: input.email, phone: input.phone, displayName: input.name, data: { ...emptyPartyData(), person: { voornamen: first, achternaam: rest.join(" "), adres: input.adres } } });
    me = (await db.select().from(schema.parties).where(eq(schema.parties.id, id)))[0];
  }
  if (me) {
    for (const k of kopers) if (k.id !== me.id && k.isPrimary) await db.update(schema.parties).set({ isPrimary: false }).where(eq(schema.parties.id, k.id));
    await db.update(schema.parties).set({ userId: user.id, email: input.email, phone: input.phone, isPrimary: true, activatedAt: new Date() }).where(eq(schema.parties.id, me.id));
  }
  const dvoText = dvoPlainText((await db.select().from(schema.dossiers).where(eq(schema.dossiers.id, dossierId)))[0].service as ServiceKey);
  await updateDossier(dossierId, (d) => {
    d.rolAanvrager = input.rol;
    d.dvo = { version: DVO_VERSION, acceptedAt: new Date().toISOString(), acceptedBy: user.id, signatureName: input.signatureName, ip: input.ip, userAgent: input.userAgent?.slice(0, 200), checks: input.checks, hash: sha256(dvoText) };
    if (d.koStatus === "ontvangen") d.koStatus = "verwerkt";
    return { status: input.hasKo && d.koStatus !== "ontbreekt" ? "intake" : "wacht_op_ko", draftToken: null };
  });
  const service = (await db.select().from(schema.dossiers).where(eq(schema.dossiers.id, dossierId)))[0].service as ServiceKey;
  const pdf = await dvoPdf(service, { version: DVO_VERSION, signatureName: input.signatureName, email: input.email, acceptedAt: new Date().toISOString(), ip: input.ip, checks: input.checks, hash: sha256(dvoText) });
  await saveDocument({ dossierId, kind: "dvo", title: "Dienstverleningsovereenkomst en akkoordbewijs", filename: `dienstverleningsovereenkomst-${DVO_VERSION}.pdf`, mime: "application/pdf", content: pdf, source: "gegenereerd", visibility: "koper", createdBy: user.id });
  await logEvent({ dossierId, actorType: "klant", actor: user, type: "dvo.akkoord", message: `Dienstverleningsovereenkomst ${DVO_VERSION} digitaal geaccepteerd door ${input.signatureName}.`, visibleTo: "koper", data: { checks: input.checks } });
  return { user, partyId: me?.id };
}
