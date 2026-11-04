import { SERVICES, COST_DEFAULTS, taxYearFor } from "@/lib/config";
import type { DossierView } from "./dossier";
import type { NotaLine, NotaState, StartersData } from "./types";
import type { Party } from "@/lib/db/schema";
import { ageOn, todayIso } from "@/lib/util/format";

/** Aandeel als breuk: "1/2" → 0.5, "60%" → 0.6. */
export function shareOf(p: Party, count: number): number {
  const a = p.data.eigendom?.aandeel;
  if (a) {
    const f = a.match(/^(\d+)\s*\/\s*(\d+)$/);
    if (f) return Number(f[1]) / Number(f[2]);
    const pc = a.match(/^(\d+(?:[.,]\d+)?)\s*%$/);
    if (pc) return Number(pc[1].replace(",", ".")) / 100;
  }
  return 1 / Math.max(1, count);
}

/**
 * Automatische voorselectie startersvrijstelling per koper (procesdocument §5A):
 * leeftijd ≥18 en <35 op verwachte datum van verkrijging, woningwaarde ≤ grens van dat jaar.
 * Positieve voorselectie is géén fiscale beoordeling — de notaris controleert.
 */
export function startersPreselectie(view: DossierView, p: Party): StartersData {
  const d = view.data;
  const prev = p.data.starters ?? {};
  const levering = d.transaction.leveringsdatum ?? d.transaction.leveringsdatumOrigineel;
  const birth = p.data.person.geboortedatum;
  const prijs = d.transaction.koopprijs;
  if (!levering || !birth || !prijs) return { ...prev, preselectie: "onbekend", reden: "Geboortedatum, koopprijs of leveringsdatum ontbreekt", controlepunt: "Startersvrijstelling: gegevens onvolledig voor automatische toets" };
  const tax = taxYearFor(levering);
  const age = ageOn(birth, levering);
  if (age < 18 || age >= 35) return { ...prev, preselectie: "niet", leeftijdOpLevering: age, reden: `leeftijd ${age} op leveringsdatum`, uitkomst: "2%" };
  const waarde = Math.max(prijs, d.property.wozWaarde ?? 0);
  if (prijs > tax.startersGrens) return { ...prev, preselectie: "niet", leeftijdOpLevering: age, reden: `koopprijs boven grens ${tax.year} (€ ${tax.startersGrens.toLocaleString("nl-NL")})`, uitkomst: "2%" };
  const cp = waarde > tax.startersGrens ? `WOZ-waarde (${waarde}) ligt boven de grens; woningwaarde nader beoordelen` : undefined;
  return { ...prev, preselectie: "mogelijk", leeftijdOpLevering: age, reden: `leeftijd ${age}, koopprijs binnen grens ${tax.year}${tax.status === "onder voorbehoud" ? " (onder voorbehoud)" : ""}`, controlepunt: cp ?? prev.controlepunt };
}

export function startersUitkomst(s: StartersData): StartersData["uitkomst"] {
  if (s.preselectie === "niet") return "2%";
  if (s.preselectie === "onbekend") return "controle_notaris";
  if (s.hoofdverblijf === "nee") return "8%";
  if (s.eerderGebruikt === "ja") return "2%";
  if (s.eerderGebruikt === "weet_niet") return "controle_notaris";
  if (s.wilGebruiken === "nee") return "2%";
  if (s.hoofdverblijf === "ja" && s.eerderGebruikt === "nee" && s.wilGebruiken === "ja") return "vrijstelling";
  return undefined;
}

export interface OBRegel { partyId: string; naam: string; aandeel: number; grondslag: number; tarief: number; bedrag: number; grond: string }

export function overdrachtsbelasting(view: DossierView): { regels: OBRegel[]; totaal: number } {
  const prijs = view.data.transaction.koopprijs ?? 0;
  const levering = view.data.transaction.leveringsdatum ?? todayIso();
  const tax = taxYearFor(levering);
  const regels = view.kopers.map((p) => {
    const aandeel = shareOf(p, view.kopers.length);
    const s = p.data.starters ?? {};
    const uitkomst = s.uitkomst ?? startersUitkomst(s) ?? (s.hoofdverblijf === "nee" ? "8%" : "2%");
    const tarief = uitkomst === "vrijstelling" ? 0 : uitkomst === "8%" ? tax.tariefOverigeWoning : tax.tariefHoofdverblijf;
    const grondslag = Math.round(prijs * aandeel * 100) / 100;
    const grond = uitkomst === "vrijstelling" ? "startersvrijstelling (art. 15 lid 1 onderdeel p WBR)" : tarief === tax.tariefHoofdverblijf ? `verlaagd tarief ${(tarief * 100).toFixed(0)}% — hoofdverblijf` : `tarief ${(tarief * 100).toFixed(1).replace(".0", "")}% — geen hoofdverblijf`;
    return { partyId: p.id, naam: p.displayName, aandeel, grondslag, tarief, bedrag: Math.round(grondslag * tarief * 100) / 100, grond };
  });
  return { regels, totaal: Math.round(regels.reduce((s, r) => s + r.bedrag, 0) * 100) / 100 };
}

function daysInYear(y: number) { return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0 ? 366 : 365; }

/** Pro-rata verrekening zakelijke lasten: koper vergoedt verkoper het deel vanaf de leveringsdatum. */
export function verrekeningLasten(view: DossierView): { ozb: number; waterschap: number; dagen: number } {
  const t = view.data.transaction;
  const lev = t.leveringsdatum ?? todayIso();
  const d = new Date(lev + "T12:00:00");
  const end = new Date(d.getFullYear(), 11, 31, 12);
  const dagen = Math.round((end.getTime() - d.getTime()) / 86400000) + 1;
  const n = daysInYear(d.getFullYear());
  return {
    ozb: COST_DEFAULTS.ozbVerrekenen && t.ozbJaarbedrag ? Math.round(((t.ozbJaarbedrag * dagen) / n) * 100) / 100 : 0,
    waterschap: t.waterschapJaarbedrag ? Math.round(((t.waterschapJaarbedrag * dagen) / n) * 100) / 100 : 0,
    dagen,
  };
}

const r2 = (n: number) => Math.round(n * 100) / 100;

export function notaKoper(view: DossierView): NotaState {
  const d = view.data;
  const t = d.transaction;
  const lines: NotaLine[] = [];
  const lev = d.service !== "hypotheek";
  if (lev) {
    if (t.koopprijs) lines.push({ label: "Koopprijs onroerende zaak", bedrag: t.koopprijs, richting: "debet" });
    if (t.roerendeZaken) lines.push({ label: "Koopprijs roerende zaken", bedrag: t.roerendeZaken, richting: "debet" });
    const ob = overdrachtsbelasting(view);
    for (const r of ob.regels) lines.push({ label: `Overdrachtsbelasting ${r.naam} (${Math.round(r.aandeel * 100)}%)`, bedrag: r.bedrag, richting: "debet", toelichting: r.grond });
    const v = verrekeningLasten(view);
    if (v.ozb) lines.push({ label: `Verrekening onroerendezaakbelasting (${v.dagen} dagen)`, bedrag: v.ozb, richting: "debet" });
    if (v.waterschap) lines.push({ label: `Verrekening waterschapslasten (${v.dagen} dagen)`, bedrag: v.waterschap, richting: "debet" });
  }
  lines.push({ label: `Notariskosten ${SERVICES[d.service].name} (all-in, incl. btw en inschrijving)`, bedrag: SERVICES[d.service].price, richting: "debet" });
  const hyp = d.financing.bankinstructie?.hypotheekbedrag ?? (d.financing.hypotheek === "ja" ? d.financing.hypotheekbedragIndicatie ?? t.financieringsvoorbehoud?.bedrag : undefined);
  if (hyp && d.financing.hypotheek !== "nee") lines.push({ label: `Hypotheekgelden ${d.financing.bankinstructie?.geldverstrekker ?? d.financing.geldverstrekker ?? "geldverstrekker"}${d.financing.bankinstructie ? "" : " (indicatief)"}`, bedrag: hyp, richting: "credit" });
  if (d.financing.bankinstructie?.afsluitkosten) lines.push({ label: "Afsluitkosten geldverstrekker", bedrag: d.financing.bankinstructie.afsluitkosten, richting: "debet" });
  if (t.waarborgsom?.bedrag && t.waarborgsom.type !== "bankgarantie" && t.waarborgsom.ontvangen) lines.push({ label: "Reeds gestorte waarborgsom", bedrag: t.waarborgsom.bedrag, richting: "credit" });
  const saldo = r2(lines.reduce((s, l) => s + (l.richting === "debet" ? l.bedrag : -l.bedrag), 0));
  return { status: d.notaKoper?.status === "definitief" ? "definitief" : d.notaKoper?.status ?? "in_voorbereiding", regels: lines, saldo, berekendOp: new Date().toISOString(), goedgekeurdOp: d.notaKoper?.goedgekeurdOp, uitbetaaldOp: d.notaKoper?.uitbetaaldOp };
}

export function notaVerkoper(view: DossierView): NotaState {
  const d = view.data;
  const t = d.transaction;
  const lines: NotaLine[] = [];
  if (t.koopprijs) lines.push({ label: "Koopprijs onroerende zaak", bedrag: t.koopprijs, richting: "credit" });
  if (t.roerendeZaken) lines.push({ label: "Koopprijs roerende zaken", bedrag: t.roerendeZaken, richting: "credit" });
  const v = verrekeningLasten(view);
  if (v.ozb) lines.push({ label: `Verrekening onroerendezaakbelasting (${v.dagen} dagen)`, bedrag: v.ozb, richting: "credit" });
  if (v.waterschap) lines.push({ label: `Verrekening waterschapslasten (${v.dagen} dagen)`, bedrag: v.waterschap, richting: "credit" });
  for (const p of view.payoffs) {
    lines.push({ label: `Aflossing hypotheek ${p.lender}${p.loanNumbers ? ` (${p.loanNumbers})` : ""}${p.status === "ontvangen" || p.status === "gecontroleerd" ? "" : " — aflosnota volgt"}`, bedrag: p.amount ? p.amount / 100 : 0, richting: "debet" });
    lines.push({ label: `Kosten doorhaling hypotheekinschrijving ${p.inschrijving ?? ""}`.trim(), bedrag: p.doorhalingKosten ? p.doorhalingKosten / 100 : COST_DEFAULTS.doorhalingPerHypotheek, richting: "debet" });
  }
  const saldo = r2(lines.reduce((s, l) => s + (l.richting === "credit" ? l.bedrag : -l.bedrag), 0));
  return { status: d.notaVerkoper?.status ?? "in_voorbereiding", regels: lines, saldo, berekendOp: new Date().toISOString(), goedgekeurdOp: d.notaVerkoper?.goedgekeurdOp, uitbetaaldOp: d.notaVerkoper?.uitbetaaldOp };
}

/** Benodigd eigen geld (indicatie) — helpt de koper bij de Wwft-uitvraag. */
export function eigenGeldIndicatie(view: DossierView): number {
  const n = notaKoper(view);
  const waarborg = view.data.transaction.waarborgsom;
  const viaWaarborg = waarborg?.type !== "bankgarantie" && waarborg?.ontvangen ? waarborg.bedrag ?? 0 : 0;
  return Math.max(0, r2(n.saldo + viaWaarborg));
}
