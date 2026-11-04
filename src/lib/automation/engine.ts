import "server-only";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { ensureChecks, loadDossierView, logEvent, updateDossier, updateParty, type DossierView } from "@/lib/domain/dossier";
import { CHECK_KEYS, koperSteps, needsHypotheek, needsLevering } from "@/lib/workflow/steps";
import { kadasterProvider, compareOwners } from "@/lib/integrations/kadaster";
import { saveDocument } from "@/lib/integrations/storage";
import { sendMail } from "@/lib/integrations/email";
import { buildHypotheekakte, buildLeveringsakte, buildStartersVerklaring, buildVolmachtKoper, buildVolmachtVerkoper, buildAflosnotaVerzoek } from "@/lib/docgen/templates";
import { irToDocx } from "@/lib/docgen/docx";
import type { DocIR } from "@/lib/docgen/ir";
import { notaKoper, notaVerkoper, startersPreselectie } from "@/lib/domain/calc";
import { sha256, token, uid } from "@/lib/util/ids";
import { addDays, daysBetween, personName, propertyLine, todayIso, dateNl } from "@/lib/util/format";
import { NOTARY_OFFICE, TERMS, COST_DEFAULTS } from "@/lib/config";
import { siteUrl } from "@/lib/util/site";
import type { DocumentKind, Visibility } from "@/lib/domain/types";

/**
 * Automatiseringsengine ("Wat doen wij — platform").
 *
 * Elke regel is idempotent: hij kijkt naar de huidige toestand en doet alleen iets
 * als er werk is. `runAutomations` wordt na iedere wijziging aangeroepen en ook
 * periodiek via /api/cron (termijnbewaking, herinneringen).
 */

const locks = new Map<string, Promise<void>>();

export async function runAutomations(dossierId: string, reason = "wijziging"): Promise<void> {
  const prev = locks.get(dossierId) ?? Promise.resolve();
  const next = prev.then(() => run(dossierId, reason)).catch((e) => console.error("[automation]", dossierId, e));
  locks.set(dossierId, next);
  await next;
  if (locks.get(dossierId) === next) locks.delete(dossierId);
}

async function run(dossierId: string, _reason: string) {
  let view = await loadDossierView(dossierId);
  if (!view || view.dossier.status === "concept" || view.dossier.status === "geannuleerd") return;
  await ensureChecks(dossierId, [...CHECK_KEYS]);

  const rules = [statusFromKo, inviteSellers, fetchKadaster, starters, financing, leveringsakte, hypotheekakte, volmachten, startersVerklaringen, notas, aflosnotaVerzoeken, handover, datumCheck, readyForPassing];
  for (const rule of rules) {
    view = (await loadDossierView(dossierId))!;
    try {
      await rule(view);
    } catch (e) {
      console.error(`[automation] ${rule.name} faalde voor ${dossierId}`, e);
      await logEvent({ dossierId, actorType: "systeem", type: "automation.error", message: `Automatische stap "${rule.name}" kon niet worden uitgevoerd: ${String(e).slice(0, 200)}` });
    }
  }
}

async function saveIr(view: DossierView, ir: DocIR, kind: DocumentKind, filenameBase: string, visibility: Visibility, extraMeta: Record<string, unknown> = {}, partyId?: string) {
  const docx = await irToDocx(ir, `${view.dossier.reference} · ${ir.title}`);
  return saveDocument({
    dossierId: view.dossier.id,
    partyId: partyId ?? null,
    kind,
    title: ir.title,
    filename: `${filenameBase}-${view.dossier.reference}.docx`,
    mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    content: docx,
    source: "gegenereerd",
    visibility,
    meta: { ir, ...extraMeta },
    replaceKind: true,
  });
}

// 1. Status na ontvangst koopovereenkomst
async function statusFromKo(view: DossierView) {
  if (view.dossier.status === "wacht_op_ko" && (view.data.koStatus === "verwerkt" || view.data.koStatus === "ontvangen")) {
    await updateDossier(view.dossier.id, () => ({ status: "intake" }));
    await logEvent({ dossierId: view.dossier.id, actorType: "systeem", type: "dossier.gestart", message: "Getekende koopovereenkomst ontvangen — inhoudelijke dossierbehandeling gestart.", visibleTo: "koper" });
  }
}

// 2. Verkopers uitnodigen (na DVO + KO)
async function inviteSellers(view: DossierView) {
  if (!needsLevering(view) || !view.data.dvo || view.data.koStatus !== "verwerkt") return;
  for (const v of view.verkopers) {
    if (v.invitedAt || !v.email) continue;
    const t = token(24);
    await updateParty(v.id, () => ({ inviteToken: sha256(t), invitedAt: new Date() }));
    await sendMail({
      to: v.email,
      dossierId: view.dossier.id,
      template: "verkoper.uitnodiging",
      subject: `Verkoop ${propertyLine(view.data.property)}: activeer je verkopersportaal`,
      heading: `Hallo ${v.data.person.roepnaam ?? v.data.person.voornamen?.split(" ")[0] ?? ""},`,
      intro: `De koper van ${propertyLine(view.data.property)} heeft de notariële afhandeling ondergebracht bij ${NOTARY_OFFICE.officeName} via Akteloket. Voor jou als verkoper staan een paar korte stappen klaar in je eigen, beveiligde portaal.`,
      paragraphs: ["Je controleert je gegevens (die we al uit de koopovereenkomst hebben gehaald), identificeert je digitaal, geeft je rekeningnummer op voor de uitbetaling en tekent een eenvoudige verkoopvolmacht. De koper ziet jouw persoonlijke en financiële gegevens niet.", "Klopt je e-mailadres niet of ben je niet de juiste persoon? Laat het ons weten, dan passen we het aan."],
      cta: { label: "Activeer mijn portaal", href: `${siteUrl()}/uitnodiging/${t}` },
      footnote: "Deze link is persoonlijk. Deel hem niet met anderen.",
    });
    await logEvent({ dossierId: view.dossier.id, actorType: "systeem", type: "verkoper.uitgenodigd", message: `Uitnodiging verkopersportaal verstuurd aan ${v.displayName} (${v.email}).` });
  }
  if (!view.data.verkoperGestartOp && view.verkopers.length) await updateDossier(view.dossier.id, (d) => { d.verkoperGestartOp = new Date().toISOString(); });
}

// 3. Kadastrale stukken ophalen
async function fetchKadaster(view: DossierView) {
  const d = view.data;
  if (d.kadaster.status !== "op_te_halen") return;
  if (needsLevering(view) && d.koStatus !== "verwerkt") return;
  const p = d.property;
  if (!(p.postcode && p.huisnummer) && !p.kadastraal?.perceel) return;
  const provider = kadasterProvider();
  const res = await provider.fetchObject({
    postcode: p.postcode, huisnummer: p.huisnummer, toevoeging: p.toevoeging, aanduiding: p.kadastraal,
    hintVerkopers: view.verkopers.map((v) => ({ naam: personName(v.data.person), geboortedatum: v.data.person.geboortedatum })),
    hintKoopprijs: d.transaction.koopprijs,
  });
  if (!res) {
    await updateDossier(view.dossier.id, (x) => { x.kadaster.status = "nader_onderzoek"; x.kadaster.signaleringen = ["Object niet gevonden in kadastrale registratie — handmatig onderzoek nodig."]; });
    return;
  }
  const raadpleeg = new Date().toISOString();
  const docs: { kind: string; documentId: string; kenmerk?: string; raadpleegdatum: string }[] = [];
  for (const doc of res.documents) {
    const id = await saveDocument({ dossierId: view.dossier.id, kind: doc.kind, filename: doc.filename, mime: doc.mime, content: doc.content, source: "kadaster", visibility: doc.kind === "kadaster_kaart" ? "koper" : "intern", meta: { bron: res.bron, kenmerk: doc.kenmerk, raadpleegdatum: raadpleeg }, replaceKind: true });
    docs.push({ kind: doc.kind, documentId: id, kenmerk: doc.kenmerk, raadpleegdatum: raadpleeg });
  }
  const signal = view.verkopers.length ? compareOwners(res.rechthebbenden, view.verkopers.map((v) => personName(v.data.person))) : [];
  if (res.registraties.some((r) => r.type === "beslag")) signal.push("Er staat een beslag ingeschreven op het registergoed.");
  if (!res.documents.some((x) => x.kind === "kadaster_akte")) signal.push("Vorige leveringsakte niet digitaal beschikbaar — aktenketen handmatig beoordelen.");
  await updateDossier(view.dossier.id, (x) => {
    x.kadaster = {
      status: signal.some((s) => /niet voor|beslag|niet gevonden/.test(s)) ? "nader_onderzoek" : "opgehaald",
      opgehaaldOp: raadpleeg, bron: res.bron, kenmerk: res.kenmerk, aanduiding: res.aanduiding,
      rechthebbenden: res.rechthebbenden, registraties: res.registraties, vorigeAkte: res.vorigeAkte, documenten: docs, signaleringen: signal,
    };
    if (!x.property.kadastraal?.perceel) x.property.kadastraal = res.aanduiding;
    for (const s of signal) if (!x.aandachtspunten.some((a) => a.tekst === s)) x.aandachtspunten.push({ id: uid(), tekst: s, ernst: "let_op", bron: "Kadaster" });
  });
  // Bestaande hypotheken → aflosnota's
  const db = await getDb();
  for (const r of res.registraties.filter((x) => x.type === "hypotheek")) {
    const insch = `Hyp4 deel ${r.deel} nr. ${r.nummer}`;
    if (view.payoffs.some((po) => po.inschrijving === insch)) continue;
    await db.insert(schema.payoffs).values({ id: uid(), dossierId: view.dossier.id, lender: r.partij ?? "Onbekende geldverstrekker", inschrijving: insch, status: "op_te_vragen", source: "kadaster", doorhalingKosten: COST_DEFAULTS.doorhalingPerHypotheek * 100 });
  }
  await logEvent({ dossierId: view.dossier.id, actorType: "systeem", type: "kadaster.opgehaald", message: `Kadastrale stukken opgehaald (${res.documents.length} documenten, ${res.registraties.length} registraties) via ${res.bron}.`, data: { kenmerk: res.kenmerk, signaleringen: signal } });
}

// 4. Startersvrijstelling — automatische voorselectie
async function starters(view: DossierView) {
  if (!needsLevering(view)) return;
  for (const k of view.kopers) {
    const next = startersPreselectie(view, k);
    const prev = k.data.starters ?? {};
    if (prev.preselectie === next.preselectie && prev.reden === next.reden && prev.leeftijdOpLevering === next.leeftijdOpLevering) continue;
    await updateParty(k.id, (d) => { d.starters = { ...next, uitkomst: next.preselectie === "niet" ? next.uitkomst : prev.uitkomst }; });
    await logEvent({ dossierId: view.dossier.id, actorType: "systeem", type: "starters.toets", message: `Startersvrijstelling ${k.displayName}: ${next.preselectie === "mogelijk" ? "mogelijk van toepassing" : next.preselectie === "niet" ? "niet van toepassing" : "onvoldoende gegevens"} (${next.reden}).` });
  }
}

// 5. Financiering → verwachting hypotheekinstructie
async function financing(view: DossierView) {
  const f = view.data.financing;
  if (!needsHypotheek(view)) return;
  if ((f.bankinstructieStatus ?? "nog_niet_verwacht") === "nog_niet_verwacht" && (f.status === "offerte_geaccepteerd" || f.status === "rond")) {
    await updateDossier(view.dossier.id, (d) => { d.financing.bankinstructieStatus = "verwacht"; });
    await logEvent({ dossierId: view.dossier.id, actorType: "systeem", type: "bank.verwacht", message: `Hypotheekinstructie van ${f.geldverstrekker ?? "geldverstrekker"} wordt verwacht (status financiering: ${f.status}).` });
  }
}

function hashOf(x: unknown) { return sha256(JSON.stringify(x)); }

// 6. Concept-leveringsakte
async function leveringsakte(view: DossierView) {
  const d = view.data;
  if (!needsLevering(view) || d.koStatus !== "verwerkt" || d.kadaster.status === "op_te_halen") return;
  if (!view.kopers.length || !view.verkopers.length) return;
  const cur = d.akteLevering;
  if (cur && (cur.status === "goedgekeurd" || cur.status === "definitief")) return;
  const input = { p: view.parties.map((p) => [p.data.person, p.data.eigendom, p.data.starters?.uitkomst, p.data.idcheck?.resultaat?.documentType]), t: d.transaction, prop: d.property, k: d.kadaster.registraties, s: d.service };
  const h = hashOf(input);
  if (cur?.inputHash === h) return;
  const ir = buildLeveringsakte(view);
  const id = await saveIr(view, ir, "concept_leveringsakte", "concept-leveringsakte", "intern", { inputHash: h });
  const version = (cur?.version ?? 0) + 1;
  await updateDossier(view.dossier.id, (x) => { x.akteLevering = { status: view.handovers.length ? "ter_controle_notaris" : "gegenereerd", version, documentId: id, generatedAt: new Date().toISOString(), controlepunten: ir.controlepunten, bronnen: ir.bronnen, inputHash: h }; });
  await logEvent({ dossierId: view.dossier.id, actorType: "systeem", type: "akte.levering", message: `Concept-leveringsakte versie ${version} gegenereerd (${ir.controlepunten.length} controlepunten, ${ir.bronnen.length} bronverwijzingen).` });
}

// 7. Concept-hypotheekakte (na bankinstructie)
async function hypotheekakte(view: DossierView) {
  const d = view.data;
  if (!needsHypotheek(view) || !d.financing.bankinstructie?.hypotheekbedrag) return;
  const cur = d.akteHypotheek;
  if (cur && (cur.status === "goedgekeurd" || cur.status === "definitief")) return;
  const h = hashOf({ b: d.financing.bankinstructie, p: view.kopers.map((k) => k.data.person), prop: d.property, k: d.kadaster.aanduiding, t: d.transaction.leveringsdatum });
  if (cur?.inputHash === h) return;
  const ir = buildHypotheekakte(view);
  const id = await saveIr(view, ir, "concept_hypotheekakte", "concept-hypotheekakte", "intern", { inputHash: h });
  const version = (cur?.version ?? 0) + 1;
  await updateDossier(view.dossier.id, (x) => {
    x.akteHypotheek = { status: "gegenereerd", version, documentId: id, generatedAt: new Date().toISOString(), controlepunten: ir.controlepunten, bronnen: ir.bronnen, inputHash: h };
    x.financing.bankinstructieStatus = "in_behandeling";
  });
  await logEvent({ dossierId: view.dossier.id, actorType: "systeem", type: "akte.hypotheek", message: `Concept-hypotheekakte versie ${version} gegenereerd op basis van de bankinstructie van ${d.financing.bankinstructie.geldverstrekker ?? "de geldverstrekker"}.` });
}

// 8. Volmachten klaarzetten
async function volmachten(view: DossierView) {
  const d = view.data;
  if (view.kopers.length && view.kopers.every((k) => k.data.gegevensBevestigd)) {
    const h = hashOf({ p: view.kopers.map((k) => k.data.person), t: d.transaction.koopprijs, f: d.financing.geldverstrekker, s: d.service });
    const signed = view.kopers.some((k) => ["ondertekend", "verwerkt"].includes(k.data.volmacht?.status ?? ""));
    if (d.volmachtKoperHash !== h && !signed) {
      const id = await saveIr(view, buildVolmachtKoper(view), "volmacht_koper", "volmacht-koper", "koper");
      await updateDossier(view.dossier.id, (x) => { x.volmachtKoperDocId = id; x.volmachtKoperHash = h; });
      await logEvent({ dossierId: view.dossier.id, actorType: "systeem", type: "volmacht.koper", message: "Gecombineerde volmacht koper klaargezet ter ondertekening.", visibleTo: "koper" });
    }
  }
  if (needsLevering(view) && view.verkopers.length && view.verkopers.every((v) => v.data.gegevensBevestigd)) {
    const h = hashOf({ p: view.verkopers.map((k) => k.data.person), k: view.kopers.map((k) => k.data.person.achternaam), t: d.transaction.koopprijs });
    const signed = view.verkopers.some((k) => ["ondertekend", "verwerkt"].includes(k.data.volmacht?.status ?? ""));
    if (d.volmachtVerkoperHash !== h && !signed) {
      const id = await saveIr(view, buildVolmachtVerkoper(view), "volmacht_verkoper", "verkoopvolmacht", "verkoper");
      await updateDossier(view.dossier.id, (x) => { x.volmachtVerkoperDocId = id; x.volmachtVerkoperHash = h; });
      for (const v of view.verkopers) await updateParty(v.id, (pd) => { pd.volmacht = { ...(pd.volmacht ?? { status: "te_plannen" }), verzondenOp: new Date().toISOString(), documentId: id }; });
      await logEvent({ dossierId: view.dossier.id, actorType: "systeem", type: "volmacht.verkoper", message: "Eenvoudige verkoopvolmacht klaargezet en verzonden naar het verkopersportaal.", visibleTo: "verkoper" });
    }
  }
}

// 9. Verklaringen startersvrijstelling
async function startersVerklaringen(view: DossierView) {
  for (const k of view.kopers) {
    const s = k.data.starters;
    if (s?.preselectie !== "mogelijk" || s.wilGebruiken !== "ja" || s.hoofdverblijf !== "ja" || s.eerderGebruikt !== "nee") continue;
    if (view.documents.some((doc) => doc.kind === "verklaring_starters" && doc.partyId === k.id)) continue;
    await saveIr(view, buildStartersVerklaring(view, k), "verklaring_starters", `verklaring-startersvrijstelling-${k.data.person.achternaam?.toLowerCase().replace(/\s+/g, "-")}`, "koper", {}, k.id);
    await logEvent({ dossierId: view.dossier.id, actorType: "systeem", type: "starters.verklaring", message: `Verklaring startersvrijstelling klaargezet voor ${k.displayName}.`, visibleTo: "koper" });
  }
}

// 10. Nota's van afrekening (concept) actueel houden
async function notas(view: DossierView) {
  if (!view.data.transaction.koopprijs && view.data.service !== "hypotheek") return;
  const nk = notaKoper(view);
  const nv = needsLevering(view) ? notaVerkoper(view) : undefined;
  const changed = JSON.stringify(view.data.notaKoper?.regels) !== JSON.stringify(nk.regels) || (nv && JSON.stringify(view.data.notaVerkoper?.regels) !== JSON.stringify(nv.regels));
  if (!changed) return;
  if (view.data.notaKoper?.status === "definitief" && view.data.notaVerkoper?.status === "definitief") return;
  await updateDossier(view.dossier.id, (x) => {
    if (x.notaKoper?.status !== "definitief") x.notaKoper = { ...nk, status: x.notaKoper?.status ?? "in_voorbereiding", documentId: x.notaKoper?.documentId };
    if (nv && x.notaVerkoper?.status !== "definitief") x.notaVerkoper = { ...nv, status: x.notaVerkoper?.status ?? "in_voorbereiding", documentId: x.notaVerkoper?.documentId };
  });
}

// 11. Verzoeken aflosnota voorbereiden (notaris verstuurt met één klik)
async function aflosnotaVerzoeken(view: DossierView) {
  const db = await getDb();
  for (const p of view.payoffs) {
    if (p.status !== "op_te_vragen" || p.requestDocumentId || !p.toestemmingVerkoper) continue;
    const id = await saveIr(view, buildAflosnotaVerzoek(view, p), "aflosnota_verzoek", `verzoek-aflosnota-${p.lender.split(" ")[0].toLowerCase()}`, "intern");
    await db.update(schema.payoffs).set({ requestDocumentId: id }).where(eq(schema.payoffs.id, p.id));
    await logEvent({ dossierId: view.dossier.id, actorType: "systeem", type: "aflosnota.voorbereid", message: `Verzoek aflosnota aan ${p.lender} voorbereid — klaar voor verzending door de notaris.` });
  }
}

// 12. Dossieroverdracht aan de notaris
async function handover(view: DossierView) {
  const d = view.data;
  const steps = koperSteps(view);
  const st = (k: string) => steps.find((s) => s.key === k)?.state;
  const kopersReady = ["gegevens", "wwft", "identificatie"].every((k) => st(k) === "done") && ["done", "in_progress"].includes(st("volmacht") ?? "");
  const db = await getDb();
  const lev = needsLevering(view);
  const hasPrimary = lev ? !!d.akteLevering && d.akteLevering.status !== "in_voorbereiding" : !!d.akteHypotheek;
  if (!view.handovers.length && kopersReady && hasPrimary) {
    const manifest = buildManifest(view);
    await db.insert(schema.handovers).values({ id: uid(), dossierId: view.dossier.id, version: 1, reason: lev ? "Dossieroverdracht: leveringsdossier met concept-leveringsakte" : "Dossieroverdracht: hypotheekdossier", manifest });
    await updateDossier(view.dossier.id, (x) => { if (x.akteLevering) x.akteLevering.status = "ter_controle_notaris"; if (x.akteHypotheek && x.akteHypotheek.status === "gegenereerd") x.akteHypotheek.status = "ter_controle_notaris"; return { status: "bij_notaris" }; });
    await notifyNotary(view, `Dossieroverdracht ${view.dossier.reference}`, `Het dossier ${propertyLine(d.property)} is compleet aangeleverd en staat klaar voor uw controle. ${manifest.openPunten.length} open punten.`);
    await logEvent({ dossierId: view.dossier.id, actorType: "systeem", type: "overdracht.1", message: `Dossier overgedragen aan de notaris (overdracht 1, ${manifest.items.length} onderdelen, ${manifest.openPunten.length} open punten).`, visibleTo: "koper" });
    return;
  }
  if (view.handovers.length && d.akteHypotheek && !view.handovers.some((h) => h.reason.includes("hypotheek")) && lev) {
    const manifest = buildManifest(view);
    await db.insert(schema.handovers).values({ id: uid(), dossierId: view.dossier.id, version: view.handovers.length + 1, reason: "Aanvullende dossierlevering: bankinstructie en concept-hypotheekakte", manifest });
    await updateDossier(view.dossier.id, (x) => { if (x.akteHypotheek) x.akteHypotheek.status = "ter_controle_notaris"; });
    await notifyNotary(view, `Aanvullende levering ${view.dossier.reference}: concept-hypotheekakte`, `De concept-hypotheekakte voor ${propertyLine(d.property)} is gegenereerd op basis van de bankinstructie en staat klaar voor uw controle.`);
    await logEvent({ dossierId: view.dossier.id, actorType: "systeem", type: "overdracht.aanvulling", message: `Aanvullende dossierlevering (overdracht ${view.handovers.length + 1}): concept-hypotheekakte.` });
  }
}

export function buildManifest(view: DossierView) {
  const d = view.data;
  const docs = (k: string) => view.documents.filter((x) => x.kind === k).map((x) => x.id);
  const items = [
    { label: "Dienstverleningsovereenkomst en bewijs van digitaal akkoord", status: d.dvo ? `Getekend ${dateNl(d.dvo.acceptedAt)} (versie ${d.dvo.version})` : "Ontbreekt", documentIds: docs("dvo") },
    { label: "Koopovereenkomst met bijlagen en addenda", status: d.koStatus, documentIds: docs("koopovereenkomst") },
    { label: "Geëxtraheerde koopgegevens, bronverwijzing en onzekere velden", status: d.extractie ? `${d.extractie.methode} · ${d.extractie.onzeker.length} onzeker · ${d.extractie.ontbrekend.length} ontbrekend` : "—" },
    { label: "Persoonsgegevens en partner-/eigendomsinformatie per betrokkene", status: `${view.parties.filter((p) => p.data.gegevensBevestigd).length}/${view.parties.length} bevestigd` },
    { label: "Identificatiestatus", status: view.parties.map((p) => `${p.displayName}: ${p.data.idcheck?.status ?? "te_starten"}`).join(", ") },
    { label: "Uitbetalings-IBAN koper en klantbevestiging", status: d.koperIban.bevestigd ? "Vastgelegd" : "Open" },
    { label: "Financieringsstatus en hypotheekinstructie", status: `${d.financing.status ?? "—"} · instructie: ${d.financing.bankinstructieStatus ?? "—"}`, documentIds: docs("bankinstructie") },
    { label: "Herkomst eigen middelen (bronnen, bedragen, bewijsstukken)", status: d.wwft.ingediendOp ? `${d.wwft.bronnen.length} bron(nen) aangeleverd` : d.financing.eigenMiddelen === "nee" ? "Geen eigen middelen" : "Open", documentIds: docs("wwft_bewijs") },
    { label: "Status gecombineerde volmacht (incl. afspraken)", status: view.parties.map((p) => `${p.displayName}: ${p.data.volmacht?.status ?? "te_plannen"}`).join(", "), documentIds: [...docs("volmacht_koper"), ...docs("volmacht_verkoper")] },
    { label: "Oorspronkelijke en actuele overdrachtsdatum", status: `${dateNl(d.transaction.leveringsdatumOrigineel)} → ${dateNl(d.transaction.leveringsdatum)} (${d.transaction.leveringsdatumStatus ?? "voorlopig"})` },
    { label: "Kadastrale gegevens en kaart (bron en raadpleegdatum)", status: `${d.kadaster.status}${d.kadaster.opgehaaldOp ? ` · ${dateNl(d.kadaster.opgehaaldOp)}` : ""}`, documentIds: [...docs("kadaster_eigendom"), ...docs("kadaster_kaart")] },
    { label: "Eerdere leveringsakte(n), erfdienstbaarheden en kwalitatieve verplichtingen", status: `${(d.kadaster.registraties ?? []).filter((r) => r.type !== "hypotheek").length} bepalingen`, documentIds: docs("kadaster_akte") },
    { label: "Concept-leveringsakte met bronnen en controlepunten", status: d.akteLevering ? `Versie ${d.akteLevering.version} · ${d.akteLevering.controlepunten.length} controlepunten` : "n.v.t.", documentIds: docs("concept_leveringsakte") },
    { label: "Concept-hypotheekakte met bronnen en controlepunten", status: d.akteHypotheek ? `Versie ${d.akteHypotheek.version}` : "Volgt na bankinstructie", documentIds: docs("concept_hypotheekakte") },
    { label: "Verkopersdossier (gekoppeld)", status: view.verkopers.length ? `${view.verkopers.length} verkoper(s) · aflosnota's: ${view.payoffs.map((p) => p.status).join(", ") || "geen"}` : "n.v.t." },
  ];
  const openPunten = [
    ...d.aandachtspunten.filter((a) => !a.opgelost).map((a) => a.tekst),
    ...(d.extractie?.ontbrekend ?? []).map((x) => `Ontbrak in koopovereenkomst: ${x}`),
    ...view.requests.filter((r) => r.status === "open").map((r) => `Open verzoek: ${r.title}`),
  ];
  return { items, openPunten };
}

async function notifyNotary(view: DossierView, subject: string, text: string) {
  const db = await getDb();
  const notaries = await db.select().from(schema.users).where(eq(schema.users.role, "notaris"));
  for (const n of notaries) {
    await sendMail({ to: n.email, dossierId: view.dossier.id, template: "notaris.melding", subject, heading: subject, intro: text, cta: { label: "Open dossier", href: `${siteUrl()}/notaris/dossiers/${view.dossier.id}` } });
  }
}

// 13. Overdrachtsdatum verifiëren (~14 dagen vooraf), herinnering en signaal aan notaris
async function datumCheck(view: DossierView) {
  const d = view.data;
  const lev = d.transaction.leveringsdatum;
  if (!lev || ["gepasseerd", "afgewikkeld", "wacht_op_ko"].includes(view.dossier.status)) return;
  const primary = view.kopers.find((k) => k.isPrimary) ?? view.kopers[0];
  if (!primary?.email) return;
  const today = todayIso();
  const opens = addDays(lev, -TERMS.datumCheckDagenVooraf);
  const dc = d.datumCheck;
  if (!dc.gevraagdOp && daysBetween(opens, today) >= 0) {
    await sendMail({
      to: primary.email, dossierId: view.dossier.id, template: "koper.datumcheck",
      subject: `Klopt de overdrachtsdatum van ${propertyLine(d.property)} nog?`,
      heading: "Klopt je overdrachtsdatum nog?",
      intro: `In onze gegevens staat dat de overdracht van je woning gepland staat op ${dateNl(lev, { weekday: true })}. Is dit nog steeds de afgesproken datum?`,
      paragraphs: ["Bevestig het met één klik in je portaal. Is de datum gewijzigd? Vul dan de nieuwe datum in, dan stemmen wij het af met de notaris en je geldverstrekker."],
      cta: { label: "Bevestig de datum", href: `${siteUrl()}/portaal/${view.dossier.id}/stap/laatste_check` },
    });
    await updateDossier(view.dossier.id, (x) => { x.datumCheck.gevraagdOp = new Date().toISOString(); });
    await logEvent({ dossierId: view.dossier.id, actorType: "systeem", type: "datum.gevraagd", message: `Datumcontrole verstuurd (${TERMS.datumCheckDagenVooraf} dagen vóór ${dateNl(lev)}).` });
    return;
  }
  if (dc.gevraagdOp && !dc.antwoord && !dc.herinneringOp && daysBetween(dc.gevraagdOp.slice(0, 10), today) >= TERMS.herinneringNaDagen) {
    await sendMail({ to: primary.email, dossierId: view.dossier.id, template: "koper.datumcheck.herinnering", subject: "Herinnering: bevestig je overdrachtsdatum", heading: "We missen nog je bevestiging", intro: `Wil je de overdrachtsdatum (${dateNl(lev)}) nog even bevestigen? Dan kan de notaris de hypotheekgelden tijdig opvragen.`, cta: { label: "Naar mijn portaal", href: `${siteUrl()}/portaal/${view.dossier.id}/stap/laatste_check` } });
    await updateDossier(view.dossier.id, (x) => { x.datumCheck.herinneringOp = new Date().toISOString(); });
    await logEvent({ dossierId: view.dossier.id, actorType: "systeem", type: "datum.herinnering", message: "Herinnering datumcontrole verstuurd." });
    return;
  }
  if (dc.herinneringOp && !dc.antwoord && !dc.signaalNotarisOp && daysBetween(dc.herinneringOp.slice(0, 10), today) >= TERMS.signaalNotarisNaDagen) {
    await updateDossier(view.dossier.id, (x) => { x.datumCheck.signaalNotarisOp = new Date().toISOString(); x.aandachtspunten.push({ id: uid(), tekst: "Koper heeft de overdrachtsdatum na herinnering niet bevestigd.", ernst: "let_op", bron: "Termijnbewaking" }); });
    await notifyNotary(view, `Signaal ${view.dossier.reference}: datum niet bevestigd`, `De koper heeft de overdrachtsdatum ${dateNl(lev)} na herinnering niet bevestigd.`);
    await logEvent({ dossierId: view.dossier.id, actorType: "systeem", type: "datum.signaal", message: "Signaal aan notaris: datum niet bevestigd." });
  }
}

// 14. Gereed voor passeren
async function readyForPassing(view: DossierView) {
  if (view.dossier.status !== "bij_notaris") return;
  const keys = CHECK_KEYS.filter((k) => k !== "passeren").filter((k) => (k !== "hypotheekakte" || needsHypotheek(view)) && (k !== "leveringsakte" && k !== "aflosnotas" ? true : needsLevering(view)));
  if (keys.every((k) => view.checks.find((c) => c.key === k)?.status === "akkoord")) {
    await updateDossier(view.dossier.id, () => ({ status: "gereed_voor_passeren" }));
    await logEvent({ dossierId: view.dossier.id, actorType: "systeem", type: "dossier.gereed", message: "Alle controles akkoord — dossier gereed om te passeren.", visibleTo: "partijen" });
  }
}

/** Periodieke taak: alle lopende dossiers langs + vriendelijke, specifieke herinneringen. */
export async function runCron(): Promise<{ dossiers: number; nudges: number }> {
  const db = await getDb();
  const rows = await db.select({ id: schema.dossiers.id, status: schema.dossiers.status }).from(schema.dossiers);
  let nudges = 0;
  for (const r of rows) {
    if (["concept", "afgewikkeld", "geannuleerd"].includes(r.status)) continue;
    await runAutomations(r.id, "cron");
    nudges += await nudge(r.id);
  }
  // Dataminimalisatie: verlaten concept-aanvragen opruimen
  const cutoff = new Date(Date.now() - TERMS.conceptBewaarDagen * 86400_000);
  for (const r of await db.select().from(schema.dossiers).where(eq(schema.dossiers.status, "concept"))) {
    if (r.createdAt < cutoff && !r.isDemo) await db.delete(schema.dossiers).where(eq(schema.dossiers.id, r.id));
  }
  return { dossiers: rows.length, nudges };
}

async function nudge(dossierId: string): Promise<number> {
  const view = await loadDossierView(dossierId);
  if (!view || !["intake", "bij_notaris", "wacht_op_ko"].includes(view.dossier.status)) return 0;
  let n = 0;
  for (const p of view.parties) {
    if (!p.email) continue;
    const last = p.data.meta?.lastNudge?.confirmedAt;
    if (last && daysBetween(last.slice(0, 10), todayIso()) < 3) continue;
    const missing: string[] = [];
    if (p.side === "koper") {
      if (view.data.koStatus === "ontbreekt" && needsLevering(view) && p.isPrimary) missing.push("de getekende koopovereenkomst");
      if (p.data.idcheck?.status === "te_starten") missing.push("je digitale identificatie");
      if (p.data.volmacht?.status === "te_plannen") missing.push("een afspraak voor je volmacht");
      if (!p.data.pep?.antwoord) missing.push("je antwoord op de PEP-vraag");
    } else {
      if (!p.activatedAt) continue;
      if (p.data.idcheck?.status === "te_starten") missing.push("je digitale identificatie");
      if (!p.data.iban?.bevestigd) missing.push("je rekeningnummer voor de uitbetaling");
    }
    if (!missing.length) continue;
    await sendMail({
      to: p.email, dossierId, template: `${p.side}.herinnering`,
      subject: `We missen nog ${missing[0]}`,
      heading: `Nog ${missing.length === 1 ? "één ding" : `${missing.length} dingen`} en je bent weer een stap verder`,
      intro: `Voor de overdracht van ${propertyLine(view.data.property)} missen we nog: ${missing.join(", ")}.`,
      paragraphs: ["Het kost je maar een paar minuten. Lukt het niet of heb je een vraag? Reageer gerust op deze e-mail."],
      cta: { label: "Naar mijn portaal", href: `${siteUrl()}/portaal/${dossierId}` },
    });
    await updateParty(p.id, (d) => { d.meta = { ...(d.meta ?? {}), lastNudge: { source: "systeem", confirmedAt: new Date().toISOString() } }; });
    n++;
  }
  return n;
}
