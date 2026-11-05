/**
 * Workflow-definities: de 12 stappen van de koper, de stappen A–G van de verkoper
 * en de controlepunten N1–N7 van de notaris. Statussen worden afgeleid uit de
 * dossiergegevens (nooit los opgeslagen), zodat ze altijd consistent zijn.
 *
 * De statuslabels volgen het procesdocument ("Klantportaal en statusoverzicht").
 */

import type { DossierView } from "@/lib/domain/dossier";
import type { Party } from "@/lib/db/schema";
import { TERMS } from "@/lib/config";
import { addDays, dateNl, daysBetween, todayIso } from "@/lib/util/format";

export type StepState = "done" | "todo" | "in_progress" | "waiting" | "attention" | "locked" | "na";
export type StepOwner = "klant" | "platform" | "notaris";

export interface Step {
  key: string;
  nr: string;
  title: string;
  description: string;
  state: StepState;
  label: string;
  owner: StepOwner;
  /** Platformactie die bij deze stap hoort ("Wat doen wij"). */
  platform: string;
  perPerson?: { partyId: string; name: string; state: StepState; label: string }[];
  actionable: boolean;
}

export const KOPER_STEP_KEYS = [
  "aanmelden", "koopovereenkomst", "gegevens", "woning", "starters", "iban",
  "wwft", "identificatie", "volmacht", "dossier", "hypotheek", "laatste_check",
] as const;
export type KoperStepKey = (typeof KOPER_STEP_KEYS)[number];

export const VERKOPER_STEP_KEYS = ["uitnodiging", "gegevens", "identificatie", "iban", "volmacht", "zekerheden", "nota"] as const;
export type VerkoperStepKey = (typeof VERKOPER_STEP_KEYS)[number];

export const CHECK_KEYS = ["wwft_id", "volmachten", "leveringsakte", "hypotheekakte", "aflosnotas", "nota", "passeren"] as const;
export type CheckKey = (typeof CHECK_KEYS)[number];

const name = (p: Party) => p.displayName || "Partij";

export function needsLevering(view: DossierView) {
  return view.data.service === "beide" || view.data.service === "levering";
}
export function needsHypotheek(view: DossierView) {
  if (view.data.service === "hypotheek") return true;
  if (view.data.service === "koopovereenkomst") return false;
  if (view.data.service === "levering") return false;
  return view.data.financing.hypotheek !== "nee";
}

export function koLocked(view: DossierView) {
  return needsLevering(view) && view.data.koStatus !== "verwerkt" && view.data.koStatus !== "ontvangen";
}

export function personDataComplete(p: Party): boolean {
  const d = p.data.person;
  const base = !!(d.voornamen && d.achternaam && d.geboortedatum && d.geboorteplaats && d.adres && d.burgerlijkeStaat && d.nationaliteit);
  if (!base) return false;
  if ((d.burgerlijkeStaat === "gehuwd" || d.burgerlijkeStaat === "geregistreerd_partner") && !d.partnerNaam) return false;
  return true;
}

function agg(states: StepState[]): StepState {
  if (!states.length) return "na";
  if (states.every((s) => s === "done" || s === "na")) return "done";
  if (states.some((s) => s === "attention")) return "attention";
  if (states.some((s) => s === "in_progress" || s === "waiting")) return states.some((s) => s === "todo") ? "todo" : "in_progress";
  if (states.some((s) => s === "done")) return "in_progress";
  return "todo";
}

/**
 * Eén samenvattend statuslabel voor een stap met meerdere personen. Zelfde label voor
 * iedereen → dat label; iedereen klaar met verschillende labels → "Afgerond"; anders
 * "x van y gereed". De labels per persoon staan in de stappenlijst zelf.
 */
export function summaryLabel(pp: { state: StepState; label: string }[]): string {
  if (!pp.length) return "—";
  const labels = [...new Set(pp.map((p) => p.label))];
  if (labels.length === 1) return labels[0];
  const rel = pp.filter((p) => p.state !== "na");
  const done = rel.filter((p) => p.state === "done").length;
  if (done === rel.length) return "Afgerond";
  return `${done} van ${rel.length} gereed`;
}

const FIN_STATUS: Record<string, string> = { aanvraag_loopt: "Aanvraag loopt", offerte_ontvangen: "Offerte ontvangen", offerte_geaccepteerd: "Offerte geaccepteerd", rond: "Financiering rond", weet_niet: "Status onbekend" };
const NOTA_STATUS: Record<string, string> = { in_voorbereiding: "concept klaar", beschikbaar: "gedeeld met partijen", definitief: "definitief" };

function openRequestFor(view: DossierView, checkKey: string, side: "koper" | "verkoper") {
  return view.requests.some((r) => r.side === side && r.checkKey === checkKey && r.status === "open");
}

// ---------------------------------------------------------------------------
// Koper
// ---------------------------------------------------------------------------

export function koperSteps(view: DossierView): Step[] {
  const d = view.data;
  const locked = koLocked(view);
  const lev = needsLevering(view);
  const hyp = needsHypotheek(view);
  const steps: Step[] = [];

  steps.push({
    key: "aanmelden", nr: "1", title: "Aanmelden & DVO akkoord",
    description: "Account aanmaken en de dienstverleningsovereenkomst digitaal accepteren.",
    state: d.dvo ? "done" : "todo", label: d.dvo ? "Getekend" : "Te tekenen", owner: "klant",
    platform: "Account, DVO en dossier inrichten (klantportaal, workflow en termijnen).", actionable: !d.dvo,
  });

  const koState: StepState = !lev ? "na" : d.koStatus === "ontbreekt" ? "todo" : d.koStatus === "verwerking_nodig" ? "attention" : "done";
  steps.push({
    key: "koopovereenkomst", nr: "2", title: "Koopovereenkomst uploaden",
    description: "Upload de getekende koopovereenkomst inclusief bijlagen. Vanaf dan start je dossier.",
    state: koState,
    label: !lev ? "Niet van toepassing" : d.koStatus === "ontbreekt" ? "Ontbreekt" : d.koStatus === "verwerking_nodig" ? "Verwerking nodig" : "Ontvangen",
    owner: "klant", platform: "KO uitlezen en kerngegevens automatisch verwerken (koopsom, object, leveringsdatum, partijen).",
    actionable: lev && d.koStatus !== "verwerkt",
  });

  const gegevens = view.kopers.map((p) => {
    const complete = personDataComplete(p) && !!p.data.gegevensBevestigd;
    const s: StepState = locked ? "locked" : openRequestFor(view, "wwft_id", "koper") && !complete ? "attention" : complete ? "done" : "todo";
    return { partyId: p.id, name: name(p), state: s, label: complete ? "Compleet aangeleverd" : "Onvolledig" };
  });
  const gState = locked ? "locked" : agg(gegevens.map((g) => g.state));
  steps.push({
    key: "gegevens", nr: "3", title: "Gegevens controleren",
    description: "Persoonsgegevens uit de koopovereenkomst controleren en waar nodig aanvullen.",
    state: gState, label: locked ? "Na upload koopovereenkomst" : gState === "done" ? "Compleet aangeleverd" : "Onvolledig", owner: "klant",
    platform: "Gegevens voorinvullen, controleren en compleetheid bewaken.", perPerson: gegevens, actionable: !locked && gState !== "done",
  });

  const fin = d.financing;
  const wState: StepState = locked ? "locked" : fin.bevestigd ? "done" : "todo";
  steps.push({
    key: "woning", nr: "4", title: "Woning & financiering",
    description: "Woninggegevens bevestigen en je financiering aangeven (geldverstrekker, status, eigen geld).",
    state: wState,
    label: locked ? "Na upload koopovereenkomst" : !fin.bevestigd ? "Nog in te vullen" : fin.hypotheek === "nee" ? "Zonder hypotheek" : FIN_STATUS[fin.status ?? ""] ?? "Aanvraag loopt",
    owner: "klant", platform: "Woning- en hypotheekgegevens registreren en koppelen aan het dossier.", actionable: !locked && !fin.bevestigd,
  });

  const starters = view.kopers.map((p) => {
    const s = p.data.starters;
    let st: StepState = "todo";
    let label = "Te beantwoorden";
    if (!lev) { st = "na"; label = "Niet van toepassing"; }
    else if (locked) { st = "locked"; label = "Na upload koopovereenkomst"; }
    else if (!s || !s.preselectie) { st = "waiting"; label = "Toets volgt automatisch"; }
    else if (s.preselectie === "niet") { st = "done"; label = s.reden ? `Niet van toepassing — ${s.reden}` : "Niet van toepassing"; }
    else if (s.uitkomst === "vrijstelling" && s.verklaringGetekendOp) { st = "done"; label = "Verklaring getekend"; }
    else if (s.uitkomst && s.uitkomst !== "vrijstelling") { st = "done"; label = s.uitkomst === "controle_notaris" ? "Controle door notaris" : `Geen vrijstelling (${s.uitkomst})`; }
    else if (s.wilGebruiken === "ja" && !s.verklaringGetekendOp) { st = "todo"; label = "Verklaring tekenen"; }
    else { st = "todo"; label = "Mogelijk van toepassing"; }
    return { partyId: p.id, name: name(p), state: st, label };
  });
  const sState = !lev ? "na" : locked ? "locked" : agg(starters.map((x) => x.state));
  steps.push({
    key: "starters", nr: "5", title: "Startersvrijstelling (OB)",
    description: "Automatische toets per koper (leeftijd, woningwaarde, eerder gebruik) en zo nodig de verklaring tekenen.",
    state: sState, label: !lev ? "Niet van toepassing" : locked ? "Na upload koopovereenkomst" : summaryLabel(starters),
    owner: "klant", platform: "Automatische toets startersvrijstelling en benodigde verklaring genereren.", perPerson: starters,
    actionable: !locked && lev && sState !== "done",
  });

  const ib = d.koperIban;
  const iState: StepState = locked ? "locked" : ib.bevestigd ? "done" : "todo";
  steps.push({
    key: "iban", nr: "6", title: "Uitbetalingsrekening (IBAN)",
    description: "Rekening waarop de notaris een eventueel tegoed uit de nota van afrekening mag terugbetalen.",
    state: iState, label: locked ? "Na upload koopovereenkomst" : ib.bevestigd ? "Vastgelegd" : "Nog op te geven", owner: "klant",
    platform: "IBAN vastleggen en controleren (formaat en rekeninghouder).", actionable: !locked && !ib.bevestigd,
  });

  const pepAll = view.kopers.every((p) => !!p.data.pep?.antwoord);
  const eigenGeld = fin.eigenMiddelen;
  const wwftStatus = d.wwft.status;
  let wwState: StepState = "todo";
  let wwLabel = "Uitvraag open";
  if (locked) { wwState = "locked"; wwLabel = "Na upload koopovereenkomst"; }
  else if (wwftStatus === "aanvullende_stukken_nodig" || openRequestFor(view, "wwft_id", "koper")) { wwState = "attention"; wwLabel = "Aanvullende stukken nodig"; }
  else if (pepAll && (eigenGeld === "nee" || d.wwft.ingediendOp)) { wwState = "done"; wwLabel = eigenGeld === "nee" ? "Aangeleverd (geen eigen middelen)" : "Wwft-informatie aangeleverd"; }
  else if (d.wwft.bronnen.length || view.kopers.some((p) => p.data.pep?.antwoord)) { wwState = "in_progress"; wwLabel = "Uitvraag open"; }
  steps.push({
    key: "wwft", nr: "7", title: "Wwft-uitvraag (incl. PEP)",
    description: "Herkomst van eigen geld per bron, met direct de juiste bewijsstukken, en de PEP-vraag per koper.",
    state: wwState, label: wwLabel, owner: "klant",
    platform: "Dynamische Wwft-uitvraag incl. PEP en opvragen bewijsstukken per geldbron.", actionable: !locked && wwState !== "done",
  });

  const ids = view.kopers.map((p) => {
    const s = p.data.idcheck?.status ?? "te_starten";
    const st: StepState = locked ? "locked" : s === "voltooid" ? "done" : s === "in_behandeling" ? "in_progress" : "todo";
    return { partyId: p.id, name: name(p), state: st, label: s === "voltooid" ? "Voltooid" : s === "in_behandeling" ? "In behandeling" : "Nog te starten" };
  });
  const idState = locked ? "locked" : agg(ids.map((x) => x.state));
  steps.push({
    key: "identificatie", nr: "8", title: "Identificeren (ID-check)",
    description: "Digitale identificatie via de door de notaris gekozen procedure.",
    state: idState, label: locked ? "Na upload koopovereenkomst" : summaryLabel(ids), owner: "klant",
    platform: "ID-check verwerken en vastleggen.", perPerson: ids, actionable: !locked && idState !== "done",
  });

  const vms = view.kopers.map((p) => {
    const s = p.data.volmacht?.status ?? "te_plannen";
    const st: StepState = locked ? "locked" : s === "verwerkt" || s === "ondertekend" ? "done" : s === "gepland" ? "in_progress" : "todo";
    const label = { te_plannen: "Te plannen", gepland: "Gepland", ondertekend: "Ondertekend", verwerkt: "Door notaris verwerkt" }[s];
    return { partyId: p.id, name: name(p), state: st, label };
  });
  const vState = locked ? "locked" : agg(vms.map((x) => x.state));
  steps.push({
    key: "volmacht", nr: "9", title: hyp && lev ? "Volmacht (levering en hypotheek)" : "Volmacht",
    description: "Eén digitale volmacht voor de notariële levering en de hypotheekakte, getekend tijdens één korte afspraak.",
    state: vState, label: locked ? "Na upload koopovereenkomst" : summaryLabel(vms), owner: "klant",
    platform: "Volmachtdocumenten klaarzetten, ondertekening registreren en opslaan in dossier.", perPerson: vms, actionable: !locked && vState !== "done",
  });

  const kad = d.kadaster.status;
  const akte = d.akteLevering;
  let dState: StepState = "waiting";
  let dLabel = "Kadastrale stukken: op te halen";
  if (locked) { dState = "locked"; dLabel = "Na upload koopovereenkomst"; }
  else if (kad === "nader_onderzoek") { dState = "attention"; dLabel = "Kadaster: nader onderzoek"; }
  else if (!lev && kad === "opgehaald") { dState = "done"; dLabel = "Kadastrale stukken opgehaald"; }
  else if (akte && akte.status === "gegenereerd" && !view.kopers.every((p) => personDataComplete(p) && p.data.gegevensBevestigd)) { dState = "in_progress"; dLabel = "Eerste concept klaar — wacht op je gegevens"; }
  else if (akte && akte.status !== "in_voorbereiding") { dState = "done"; dLabel = akte.status === "goedgekeurd" ? "Concept-leveringsakte goedgekeurd" : akte.status === "definitief" ? "Leveringsakte definitief" : akte.status === "ter_controle_notaris" ? "Concept-leveringsakte bij de notaris" : "Concept-leveringsakte gegenereerd"; }
  else if (kad === "opgehaald") { dState = "in_progress"; dLabel = "Concept-leveringsakte in voorbereiding"; }
  steps.push({
    key: "dossier", nr: "10", title: "Dossiervoorbereiding",
    description: "Wij halen automatisch kadastrale stukken op en genereren de concept-leveringsakte.",
    state: dState, label: dLabel, owner: "platform",
    platform: "Kadastrale gegevens, kaart, erfdienstbaarheden/kwalitatieve verplichtingen, eerdere leveringsakte; concept-leveringsakte genereren.",
    actionable: false,
  });

  const bi = fin.bankinstructieStatus ?? "nog_niet_verwacht";
  let hState: StepState = "waiting";
  let hLabel = { nog_niet_verwacht: "Hypotheekinstructie: nog niet verwacht", verwacht: "Hypotheekinstructie: verwacht", ontvangen: "Hypotheekinstructie: ontvangen", in_behandeling: "Hypotheekinstructie: in behandeling" }[bi];
  if (!hyp) { hState = "na"; hLabel = "Niet van toepassing"; }
  else if (locked) { hState = "locked"; hLabel = "Na upload koopovereenkomst"; }
  else if (d.akteHypotheek && d.akteHypotheek.status !== "in_voorbereiding") { hState = "done"; hLabel = d.akteHypotheek.status === "goedgekeurd" ? "Concept-hypotheekakte goedgekeurd" : "Concept-hypotheekakte gegenereerd"; }
  else if (bi === "ontvangen" || bi === "in_behandeling") hState = "in_progress";
  steps.push({
    key: "hypotheek", nr: "11", title: "Bankinstructie & concept-hypotheekakte",
    description: "De geldverstrekker stuurt de hypotheekinstructie rechtstreeks naar de notaris; wij genereren daarna automatisch de concept-hypotheekakte.",
    state: hState, label: hLabel, owner: "platform",
    platform: "Bankinstructie verwerken en concept-hypotheekakte genereren.", actionable: false,
  });

  const lever = d.transaction.leveringsdatum;
  const opens = lever ? addDays(lever, -TERMS.datumCheckDagenVooraf) : undefined;
  const isOpen = !!opens && daysBetween(todayIso(), opens) <= 0;
  let lState: StepState = "locked";
  let lLabel = lever && opens ? `Vanaf ${dateNl(opens, { short: true })}` : "Leveringsdatum nog te bepalen";
  if (d.datumCheck.antwoord === "ja" || d.datumCheck.antwoord === "nee_nieuwe_datum") { lState = "done"; lLabel = d.datumCheck.antwoord === "ja" ? "Overdrachtsdatum bevestigd" : "Overdrachtsdatum gewijzigd"; }
  else if (d.datumCheck.antwoord === "onbekend") { lState = "attention"; lLabel = "Nieuwe datum nog niet bekend"; }
  else if (isOpen || d.datumCheck.gevraagdOp) { lState = "todo"; lLabel = "Bevestig je overdrachtsdatum"; }
  steps.push({
    key: "laatste_check", nr: "12", title: "Laatste check & bevestigen",
    description: `Circa ${TERMS.datumCheckDagenVooraf} dagen voor overdracht: leveringsdatum bevestigen en laatste controle van de gegevens.`,
    state: locked ? "locked" : lState, label: locked ? "Na upload koopovereenkomst" : lLabel, owner: "klant",
    platform: "Termijnbewaking, herinnering en dossiercontrole (2-weken check leveringsdatum).", actionable: lState === "todo" || lState === "attention",
  });

  return steps;
}

// ---------------------------------------------------------------------------
// Verkoper
// ---------------------------------------------------------------------------

export function verkoperSteps(view: DossierView): Step[] {
  const d = view.data;
  const steps: Step[] = [];
  const vks = view.verkopers;

  const inv = vks.map((p) => ({ partyId: p.id, name: name(p), state: (p.activatedAt ? "done" : p.invitedAt ? "todo" : "waiting") as StepState, label: p.activatedAt ? "Portaal geactiveerd" : p.invitedAt ? "Uitnodiging verstuurd" : "Wacht op koopovereenkomst" }));
  steps.push({
    key: "uitnodiging", nr: "A", title: "Uitnodiging portaal",
    description: "Na akkoord DVO van de koper en ontvangst van de koopovereenkomst ontvangt iedere verkoper een uitnodiging voor het eigen portaal.",
    state: agg(inv.map((i) => i.state)), label: summaryLabel(inv), owner: "platform",
    platform: "Uitnodiging versturen, account aanmaken en verkopersdossier inrichten.", perPerson: inv, actionable: false,
  });

  const geg = vks.map((p) => {
    const ok = personDataComplete(p) && !!p.data.gegevensBevestigd;
    return { partyId: p.id, name: name(p), state: (ok ? "done" : "todo") as StepState, label: ok ? "Compleet aangeleverd" : "Onvolledig" };
  });
  steps.push({
    key: "gegevens", nr: "B", title: "Gegevens controleren",
    description: "Persoonsgegevens (uit de koopovereenkomst) controleren en aanvullen, inclusief mede-eigenaren.",
    state: agg(geg.map((g) => g.state)), label: agg(geg.map((g) => g.state)) === "done" ? "Compleet aangeleverd" : "Onvolledig", owner: "klant",
    platform: "Gegevens voorinvullen (uit KO) en controleren/aanvullen.", perPerson: geg, actionable: true,
  });

  const ids = vks.map((p) => {
    const s = p.data.idcheck?.status ?? "te_starten";
    return { partyId: p.id, name: name(p), state: (s === "voltooid" ? "done" : s === "in_behandeling" ? "in_progress" : "todo") as StepState, label: s === "voltooid" ? "Voltooid" : s === "in_behandeling" ? "In behandeling" : "Nog te starten" };
  });
  steps.push({
    key: "identificatie", nr: "C", title: "Identificeren (ID-check)",
    description: "Digitale identificatie via de door de notaris voorgeschreven procedure.",
    state: agg(ids.map((i) => i.state)), label: summaryLabel(ids), owner: "klant",
    platform: "ID-check verwerken en vastleggen.", perPerson: ids, actionable: true,
  });

  const ibans = vks.map((p) => ({ partyId: p.id, name: name(p), state: (p.data.iban?.bevestigd ? "done" : "todo") as StepState, label: p.data.iban?.bevestigd ? "Vastgelegd" : "Nog op te geven" }));
  steps.push({
    key: "iban", nr: "D", title: "IBAN uitbetaling",
    description: "Rekening voor de uitbetaling van de netto verkoopopbrengst door de notaris (en verdeling bij meerdere verkopers).",
    state: agg(ibans.map((i) => i.state)), label: agg(ibans.map((i) => i.state)) === "done" ? "Vastgelegd" : "Nog op te geven", owner: "klant",
    platform: "IBAN registreren en valideren.", perPerson: ibans, actionable: true,
  });

  const vms = vks.map((p) => {
    const v = p.data.volmacht ?? { status: "te_plannen" as const };
    let st: StepState = "todo";
    let label = "Te ondertekenen";
    if (v.status === "verwerkt") { st = "done"; label = "Door notaris verwerkt"; }
    else if (v.ontvangenOp || (v.status === "ondertekend" && v.legalisatie !== "vereist")) { st = "done"; label = "Ondertekend en ontvangen"; }
    else if (v.status === "ondertekend" && v.legalisatie === "vereist") { st = "in_progress"; label = "Legalisatie vereist"; }
    else if (v.status === "gepland") { st = "in_progress"; label = "Afspraak gepland"; }
    else if (!v.verzondenOp) { st = "waiting"; label = "In voorbereiding"; }
    return { partyId: p.id, name: name(p), state: st, label };
  });
  steps.push({
    key: "volmacht", nr: "E", title: "Eenvoudige verkoopvolmacht",
    description: "De notaris stelt een eenvoudige volmacht op voor de levering. Je ondertekent deze (en laat zo nodig je handtekening legaliseren).",
    state: agg(vms.map((v) => v.state)), label: summaryLabel(vms), owner: "klant",
    platform: "Volmacht klaarzetten, ondertekening registreren en opslaan in dossier.", perPerson: vms, actionable: true,
  });

  const pos = view.payoffs;
  const confirmed = vks.some((p) => p.data.meta?.zekerhedenBevestigd);
  let zState: StepState = "todo";
  let zLabel = "Bevestig bestaande hypotheken";
  if (confirmed && pos.length === 0) { zState = "done"; zLabel = "Geen af te lossen hypotheken"; }
  else if (confirmed && pos.every((p) => p.status === "gecontroleerd")) { zState = "done"; zLabel = "Aflosnota's gecontroleerd"; }
  else if (confirmed) {
    zState = "in_progress";
    const lab = { op_te_vragen: "op te vragen", aangevraagd: "aangevraagd", ontvangen: "ontvangen", gecontroleerd: "gecontroleerd" };
    const ontvangen = pos.filter((p) => p.status === "ontvangen" || p.status === "gecontroleerd").length;
    zLabel = pos.length === 1 ? `Aflosnota ${lab[pos[0].status]}${pos[0].status === "ontvangen" ? " — notaris controleert" : ""}` : `${ontvangen} van ${pos.length} aflosnota's ontvangen`;
  }
  steps.push({
    key: "zekerheden", nr: "F", title: "Bestaande zekerheden en aflosnota's",
    description: "Inzicht geven in bestaande hypotheken/leningen. De notaris vraagt de aflosnota('s) op bij de geldverstrekker(s).",
    state: zState, label: zLabel, owner: "klant",
    platform: "Aflosnota-verzoek en status bewaken (bij de notaris), gegevens verwerken in dossier.", actionable: !confirmed,
  });

  const nota = d.notaVerkoper;
  let nState: StepState = "waiting";
  let nLabel = "Nota van afrekening: in voorbereiding";
  if (nota?.uitbetaaldOp) { nState = "done"; nLabel = "Uitbetaald"; }
  else if (nota?.status === "definitief") { nState = "done"; nLabel = "Nota definitief — uitbetaling na overdracht"; }
  else if (nota?.status === "beschikbaar") { nState = "todo"; nLabel = "Nota beschikbaar — bekijk en bevestig"; }
  steps.push({
    key: "nota", nr: "G", title: "Nota van afrekening en uitbetaling",
    description: "De notaris stelt de nota van afrekening op (verkoopprijs, aflossingen, kosten doorhaling). Het restant wordt na de overdracht uitbetaald op je IBAN.",
    state: nState, label: nLabel, owner: "notaris",
    platform: "Gegevens aanleveren voor de nota van afrekening en voortgang bewaken tot en met uitbetaling.", actionable: nState === "todo",
  });

  return steps;
}

// ---------------------------------------------------------------------------
// Notaris
// ---------------------------------------------------------------------------

export interface NotaryCheck {
  key: CheckKey;
  nr: string;
  title: string;
  description: string;
  applicable: boolean;
  ready: boolean;
  readyLabel: string;
  status: "open" | "akkoord" | "aanvulling_gevraagd";
  flags: { tekst: string; ernst: "info" | "let_op" | "kritiek" }[];
}

export function notaryChecks(view: DossierView): NotaryCheck[] {
  const d = view.data;
  const st = (k: CheckKey) => view.checks.find((c) => c.key === k)?.status ?? "open";
  const lev = needsLevering(view);
  const hyp = needsHypotheek(view);
  const all = view.parties;
  const res: NotaryCheck[] = [];

  // N1
  const idsDone = all.every((p) => p.data.idcheck?.status === "voltooid");
  const pepDone = all.every((p) => !!p.data.pep?.antwoord || p.side === "verkoper");
  const wwftDone = d.financing.eigenMiddelen === "nee" || !!d.wwft.ingediendOp;
  const flags1: NotaryCheck["flags"] = [];
  for (const p of all) {
    if (p.data.pep?.antwoord === "ja") flags1.push({ tekst: `${name(p)} heeft aangegeven PEP (of familielid/naaste geassocieerde) te zijn.`, ernst: "kritiek" });
    const m = p.data.idcheck?.match;
    if (m && (!m.naam || !m.geboortedatum)) flags1.push({ tekst: `ID-check ${name(p)}: ${m.opmerking ?? "gegevens wijken af van koopovereenkomst"}.`, ernst: "let_op" });
  }
  for (const b of d.wwft.bronnen) {
    if (b.eigenaarGeld === "derde" || b.rekening === "iemand_anders") flags1.push({ tekst: `Geld van een derde (${b.type}, ${b.bedrag ? "€ " + b.bedrag.toLocaleString("nl-NL") : "bedrag onbekend"}).`, ernst: "let_op" });
    if (b.rekening === "onderneming" || b.type === "onderneming") flags1.push({ tekst: `Middelen via onderneming (${b.details?.onderneming ?? "onbekend"}).`, ernst: "let_op" });
    if (b.type === "schenking" || b.type === "lening") flags1.push({ tekst: `${b.type === "schenking" ? "Schenking" : "Lening"} van ${b.details?.van ?? "derde"}: ${b.bedrag ? "€ " + b.bedrag.toLocaleString("nl-NL") : "?"}.`, ernst: "info" });
  }
  if (d.koperIban.derde) flags1.push({ tekst: "Uitbetalingsrekening koper staat (mogelijk) op naam van een derde.", ernst: "let_op" });
  res.push({
    key: "wwft_id", nr: "N1", title: "Wwft-uitvraag (incl. PEP) en identificatie",
    description: "Controleert de Wwft-uitvraag, PEP-antwoorden en de identificatie van koper(s) en verkoper(s).",
    applicable: true, ready: idsDone && pepDone && wwftDone,
    readyLabel: idsDone && pepDone && wwftDone ? "Alle informatie aangeleverd" : `${all.filter((p) => p.data.idcheck?.status === "voltooid").length}/${all.length} geïdentificeerd · Wwft ${wwftDone ? "aangeleverd" : "open"}`,
    status: st("wwft_id"), flags: flags1,
  });

  // N2
  const vmDone = all.every((p) => ["ondertekend", "verwerkt"].includes(p.data.volmacht?.status ?? "") && !(p.side === "verkoper" && p.data.volmacht?.legalisatie === "vereist" && !p.data.volmacht?.ontvangenOp));
  res.push({
    key: "volmachten", nr: "N2", title: "Volmachten koper en verkoper",
    description: "Beoordeelt en accepteert de volmachten (koper: gecombineerd levering + hypotheek; verkoper: eenvoudige verkoopvolmacht).",
    applicable: true, ready: vmDone,
    readyLabel: `${all.filter((p) => ["ondertekend", "verwerkt"].includes(p.data.volmacht?.status ?? "")).length}/${all.length} ondertekend`,
    status: st("volmachten"), flags: [],
  });

  // N3
  const ak = d.akteLevering;
  const flags3: NotaryCheck["flags"] = (ak?.controlepunten ?? []).map((t) => ({ tekst: t, ernst: "let_op" as const }));
  for (const s of d.kadaster.signaleringen ?? []) flags3.push({ tekst: s, ernst: "let_op" });
  res.push({
    key: "leveringsakte", nr: "N3", title: "Concept-leveringsakte",
    description: "Controleert de automatisch opgestelde concept-leveringsakte met bronverwijzingen en controlepunten.",
    applicable: lev, ready: !!ak && ak.status !== "in_voorbereiding",
    readyLabel: ak ? `Versie ${ak.version} · ${ak.controlepunten.length} controlepunten` : "In voorbereiding",
    status: st("leveringsakte"), flags: flags3,
  });

  // N4
  const ah = d.akteHypotheek;
  res.push({
    key: "hypotheekakte", nr: "N4", title: "Concept-hypotheekakte (en bankinstructie)",
    description: "Controleert de concept-hypotheekakte tegen de actuele bankinstructie van de geldverstrekker.",
    applicable: hyp, ready: !!ah && ah.status !== "in_voorbereiding",
    readyLabel: ah ? `Versie ${ah.version} · ${ah.controlepunten.length} controlepunten` : d.financing.bankinstructieStatus === "ontvangen" ? "Instructie ontvangen" : "Wacht op bankinstructie",
    status: st("hypotheekakte"), flags: (ah?.controlepunten ?? []).map((t) => ({ tekst: t, ernst: "let_op" as const })),
  });

  // N5
  const pos = view.payoffs;
  res.push({
    key: "aflosnotas", nr: "N5", title: "Aflosnota's en doorhaling",
    description: "Vraagt aflosnota('s) op bij de geldverstrekker(s) van de verkoper en regelt doorhaling van bestaande zekerheden.",
    applicable: lev, ready: pos.length === 0 ? view.verkopers.some((p) => p.data.meta?.zekerhedenBevestigd) : pos.every((p) => p.status === "ontvangen" || p.status === "gecontroleerd"),
    readyLabel: pos.length === 0 ? "Geen inschrijvingen" : `${pos.filter((p) => p.status === "ontvangen" || p.status === "gecontroleerd").length}/${pos.length} ontvangen`,
    status: st("aflosnotas"), flags: pos.filter((p) => p.status === "op_te_vragen").map((p) => ({ tekst: `Aflosnota ${p.lender} nog op te vragen.`, ernst: "info" as const })),
  });

  // N6
  res.push({
    key: "nota", nr: "N6", title: "Nota's van afrekening",
    description: "Stelt de nota('s) van afrekening op voor koper en verkoper (automatisch voorbereid).",
    applicable: true, ready: !!d.notaKoper && (!lev || !!d.notaVerkoper),
    readyLabel: d.notaKoper ? `Koper: ${NOTA_STATUS[d.notaKoper.status] ?? d.notaKoper.status}${lev ? ` · Verkoper: ${d.notaVerkoper ? NOTA_STATUS[d.notaVerkoper.status] ?? d.notaVerkoper.status : "nog in voorbereiding"}` : ""}` : "Nog in voorbereiding",
    status: st("nota"), flags: [],
  });

  // N7
  const prior = res.filter((c) => c.applicable).every((c) => c.status === "akkoord");
  const datumOk = d.transaction.leveringsdatumStatus === "bevestigd" || d.datumCheck.antwoord === "ja" || d.datumCheck.antwoord === "nee_nieuwe_datum";
  res.push({
    key: "passeren", nr: "N7", title: "Passeren en definitieve afwikkeling",
    description: "Passeert de akte(n), laat inschrijven in het Kadaster en wikkelt de transactie financieel af.",
    applicable: true, ready: prior && datumOk,
    readyLabel: d.afgewikkeldOp ? "Afgewikkeld" : d.gepasseerdOp ? "Gepasseerd — afwikkeling loopt" : prior ? (datumOk ? "Gereed om te passeren" : "Wacht op bevestiging datum") : "Wacht op N1–N6",
    status: st("passeren"), flags: datumOk ? [] : [{ tekst: "Overdrachtsdatum nog niet bevestigd door koper.", ernst: "info" }],
  });

  return res;
}

export function progress(steps: Step[], partyId?: string): { done: number; total: number; pct: number } {
  const rel = steps.map((s) => stateFor(s, partyId)).filter((st) => st !== "na");
  const done = rel.filter((st) => st === "done").length;
  return { done, total: rel.length, pct: rel.length ? Math.round((done / rel.length) * 100) : 0 };
}

/** Status van een stap voor één persoon (persoonlijke stappen), anders de stapstatus. */
export function stateFor(s: Step, partyId?: string): StepState {
  return (partyId && s.perPerson?.find((p) => p.partyId === partyId)?.state) || s.state;
}

export function stateTone(s: StepState): { bg: string; text: string; dot: string; label: string } {
  switch (s) {
    case "done": return { bg: "bg-ok-50", text: "text-ok-700", dot: "bg-ok-600", label: "Gereed" };
    case "attention": return { bg: "bg-warn-50", text: "text-warn-700", dot: "bg-warn-600", label: "Actie nodig" };
    case "in_progress": return { bg: "bg-brand-50", text: "text-brand-700", dot: "bg-brand-500", label: "Bezig" };
    case "waiting": return { bg: "bg-platform-50", text: "text-platform-600", dot: "bg-platform-600", label: "Wacht" };
    case "locked": return { bg: "bg-ink-50", text: "text-ink-400", dot: "bg-ink-300", label: "Later" };
    case "na": return { bg: "bg-ink-50", text: "text-ink-400", dot: "bg-ink-200", label: "n.v.t." };
    default: return { bg: "bg-white", text: "text-ink-700", dot: "bg-ink-400", label: "Te doen" };
  }
}

// ---------------------------------------------------------------------------
// Product koopovereenkomst opstellen
// ---------------------------------------------------------------------------

export function koopovereenkomstSteps(view: DossierView): Step[] {
  const ko = view.data.koopovereenkomst ?? { status: "concept" as const };
  const order = ["concept", "ter_controle", "verzonden", "getekend", "bedenktijd", "definitief"] as const;
  const at = order.indexOf(ko.status);
  const signed = view.parties.filter((p) => p.data.meta?.koGetekend).length;
  const mk = (key: string, nr: string, title: string, description: string, from: number, label: [string, string, string], owner: StepOwner, platform: string): Step => {
    const state: StepState = at > from ? "done" : at === from ? (owner === "klant" ? "todo" : "in_progress") : "locked";
    return { key, nr, title, description, state, label: state === "done" ? label[1] : state === "locked" ? label[2] : label[0], owner, platform, actionable: state === "todo" };
  };
  return [
    { key: "vragenlijst", nr: "1", title: "Vragenlijst", description: "Woning, partijen, prijs, leveringsdatum, waarborgsom en ontbindende voorwaarden.", state: "done", label: "Ingevuld", owner: "klant", platform: "Gegevens structureren en kadastrale aanduiding opzoeken.", actionable: false },
    mk("concept", "2", "Concept-koopovereenkomst", "Wij stellen de overeenkomst op volgens een vaste structuur.", 0, ["In voorbereiding", "Opgesteld", "Na de vragenlijst"], "platform", "Concept genereren uit de vragenlijst."),
    mk("controle", "3", "Juridische controle", "Een jurist controleert het concept en de bijzondere afspraken.", 1, ["Ter controle", "Gecontroleerd", "Na het concept"], "platform", "Juridische controle en eventuele vragen aan partijen."),
    { ...mk("ondertekenen", "4", "Ondertekenen", "Koper en verkoper ondertekenen digitaal.", 2, [`${signed} van ${view.parties.length} getekend`, "Door alle partijen getekend", "Na juridische controle"], "klant", "Digitale ondertekening registreren en exemplaren uitreiken."), actionable: at === 2 },
    mk("bedenktijd", "5", "Bedenktijd koper", "De koper heeft drie dagen bedenktijd na terhandstelling.", 3, [view.data.transaction.bedenktijdEinde ? `Loopt tot en met ${dateNl(view.data.transaction.bedenktijdEinde, { short: true })}` : "Loopt", "Verstreken", "Na ondertekening"], "platform", "Bedenktijd en termijnen (waarborgsom, voorbehouden) bewaken."),
    { key: "akte", nr: "6", title: "Door naar de akte van levering", description: "Start met één klik de notariële afhandeling; alle gegevens staan al klaar.", state: at >= 3 ? "todo" : "locked", label: at >= 3 ? "Beschikbaar" : "Na ondertekening", owner: "klant", platform: "Dossier omzetten naar levering (+ hypotheek) zonder dubbele uitvraag.", actionable: at >= 3 },
  ];
}
