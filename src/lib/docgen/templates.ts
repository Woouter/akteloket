import "server-only";
import type { DossierView } from "@/lib/domain/dossier";
import type { Party, Payoff } from "@/lib/db/schema";
import type { NotaState } from "@/lib/domain/types";
import { IRBuilder, type DocIR, type Run } from "./ir";
import { NOTARY_OFFICE, taxYearFor } from "@/lib/config";
import { dateNl, euro, personName, propertyLine, formatIban } from "@/lib/util/format";
import { overdrachtsbelasting, shareOf } from "@/lib/domain/calc";
import { needsHypotheek, needsLevering } from "@/lib/workflow/steps";

/**
 * Modellen voor de concept-akten. Dit is een STANDAARDMODEL ter validatie door de
 * notaris (procesdocument §10A/§10B): de notaris keurt het model en de vaste
 * clausulebibliotheek goed. Elke overgenomen bepaling vermeldt haar bron; ontbrekende
 * gegevens worden gemarkeerd en niet op basis van aannames ingevuld.
 */

const BRON = {
  ko: "Koopovereenkomst (geüpload, uitgelezen en door klant bevestigd)",
  klant: "Opgave klant in portaal",
  kad: "Kadastrale raadpleging",
  akte: "Vorige leveringsakte (Kadaster)",
  bank: "Hypotheekinstructie geldverstrekker",
  id: "Identificatie (ID-check)",
  sys: "Berekening platform",
};

const staatTekst: Record<string, string> = {
  ongehuwd: "ongehuwd en niet geregistreerd als partner",
  gehuwd: "gehuwd",
  geregistreerd_partner: "geregistreerd partner",
  gescheiden: "gescheiden en niet geregistreerd als partner",
  weduwe: "weduwe/weduwnaar en niet geregistreerd als partner",
};

function comparitiePersoon(b: IRBuilder, p: Party, nr: number): Run[] {
  const d = p.data.person;
  const bron = p.data.idcheck?.status === "voltooid" ? `${BRON.ko}; geverifieerd via ${BRON.id}` : BRON.ko;
  const runs: Run[] = [
    `${nr}. `,
    b.f(personName(d), `Naam ${p.side} ${nr}`, bron),
    ", geboren te ",
    b.f(d.geboorteplaats, `Geboorteplaats ${p.side} ${nr}`, bron),
    " op ",
    b.f(d.geboortedatum ? dateNl(d.geboortedatum) : undefined, `Geboortedatum ${p.side} ${nr}`, bron),
    ", wonende te ",
    b.f([d.postcode, d.woonplaats].filter(Boolean).join(" ") || undefined, `Woonplaats ${p.side} ${nr}`, BRON.klant),
    ", ",
    b.f(d.adres, `Adres ${p.side} ${nr}`, BRON.klant),
    ", ",
    b.f(d.burgerlijkeStaat ? staatTekst[d.burgerlijkeStaat] : undefined, `Burgerlijke staat ${p.side} ${nr}`, BRON.klant),
  ];
  if ((d.burgerlijkeStaat === "gehuwd" || d.burgerlijkeStaat === "geregistreerd_partner") && d.partnerNaam) runs.push(" met ", b.f(d.partnerNaam, `Partner ${p.side} ${nr}`, BRON.klant));
  if (d.huwelijkseVoorwaarden === "ja") runs.push(" ", b.check(`Huwelijkse/partnerschapsvoorwaarden ${personName(d)}: beoordelen of toestemming echtgenoot/partner nodig is en of voorwaarden zijn ingeschreven`));
  if (d.huwelijkseVoorwaarden === "weet_niet") b.check(`${personName(d)} weet niet of er huwelijkse voorwaarden zijn: huwelijksgoederenregister raadplegen`);
  runs.push(p.data.idcheck?.resultaat?.documentType ? `, zich legitimerende met ${p.data.idcheck.resultaat.documentType.toLowerCase()} nummer ${p.data.idcheck.resultaat.documentNummerMasked ?? "[NUMMER]"}` : ", ", p.data.idcheck?.resultaat ? "" : b.f(undefined, `Legitimatie ${p.side} ${nr}`, BRON.id), ";");
  return runs;
}

function objectRuns(b: IRBuilder, view: DossierView): Run[] {
  const p = view.data.property;
  const k = view.data.kadaster.aanduiding ?? p.kadastraal ?? {};
  const kbron = view.data.kadaster.status === "opgehaald" ? `${BRON.kad} (${view.data.kadaster.kenmerk ?? ""}, ${dateNl(view.data.kadaster.opgehaaldOp)})` : BRON.ko;
  return [
    b.f(p.omschrijving ?? (p.soort === "appartement" ? "het appartementsrecht" : "de woning met ondergrond, erf en verdere aanhorigheden"), "Omschrijving registergoed", BRON.ko),
    ", staande en gelegen te ",
    b.f(propertyLine(p) || undefined, "Adres registergoed", BRON.ko),
    ", kadastraal bekend gemeente ",
    b.f(k.gemeente, "Kadastrale gemeente", kbron),
    ", sectie ",
    b.f(k.sectie, "Sectie", kbron),
    ", nummer ",
    b.f(k.perceel, "Perceelnummer", kbron),
    k.appartementsindex ? `, appartementsindex ${k.appartementsindex}` : "",
    ", groot ",
    b.f(k.grootte ?? (k.grootteM2 ? `${k.grootteM2} m²` : undefined), "Kadastrale grootte", kbron),
  ];
}

const gevolmachtigde = () => `[NAAM MEDEWERKER], werkzaam ten kantore van mij, notaris, te ${NOTARY_OFFICE.city}`;

// ---------------------------------------------------------------------------
// Leveringsakte
// ---------------------------------------------------------------------------

export function buildLeveringsakte(view: DossierView): DocIR {
  const b = new IRBuilder();
  const d = view.data;
  const t = d.transaction;
  b.title("LEVERING");
  b.subtitle(`${propertyLine(d.property)}, dossier ${view.dossier.reference}`);
  b.p("Heden, ", b.f(t.leveringsdatum ? dateNl(t.leveringsdatum) : undefined, "Passeerdatum", `${BRON.ko}; actuele datum`), ", verscheen voor mij, ", NOTARY_OFFICE.notaryName.replace(/ \(.*\)/, "") + `, notaris te ${NOTARY_OFFICE.city}:`);
  b.p(gevolmachtigde() + ",");
  b.p("te dezen handelend als schriftelijk gevolmachtigde van:");
  view.verkopers.forEach((p, i) => b.li("", ...comparitiePersoon(b, p, i + 1)));
  b.p(`hierna${view.verkopers.length > 1 ? ", tezamen en ieder afzonderlijk," : ""} te noemen: "verkoper";`);
  b.p("en als schriftelijk gevolmachtigde van:");
  view.kopers.forEach((p, i) => b.li("", ...comparitiePersoon(b, p, i + 1)));
  b.p(`hierna${view.kopers.length > 1 ? ", tezamen en ieder afzonderlijk," : ""} te noemen: "koper".`);
  b.p("Van de volmachten blijkt uit onderhandse akten van volmacht, die aan deze akte zullen worden gehecht.");
  if (view.parties.some((p) => (p.data.volmacht?.status ?? "te_plannen") === "te_plannen" || p.data.volmacht?.status === "gepland")) b.check("Nog niet alle volmachten zijn ondertekend: volmachten controleren vóór passeren");

  b.h("Koopovereenkomst");
  b.p("De comparant, handelend als gemeld, verklaarde dat tussen verkoper en koper een koopovereenkomst is gesloten met betrekking tot het hierna te omschrijven registergoed, blijkende uit een door partijen op ", b.f(t.datumOndertekening ? dateNl(t.datumOndertekening) : undefined, "Datum ondertekening koopovereenkomst", BRON.ko), ` ondertekende onderhandse akte, hierna te noemen: de "Koopovereenkomst".`);
  if (t.bedenktijdEinde) b.p("De wettelijke bedenktijd van koper is verstreken op ", b.f(dateNl(t.bedenktijdEinde), "Einde bedenktijd", BRON.ko), ".");

  b.h("Levering");
  b.p("Ter uitvoering van de Koopovereenkomst levert verkoper hierbij aan koper, die hierbij van verkoper in eigendom aanvaardt:");
  b.p(...objectRuns(b, view), `, hierna te noemen: het "Registergoed".`);
  if (view.kopers.length > 1) {
    const shares = view.kopers.map((p) => `${p.displayName} voor ${p.data.eigendom?.aandeel ?? `1/${view.kopers.length}`}`).join(" en ");
    b.p("Koper verkrijgt het Registergoed in onverdeelde eigendom, te weten: ", b.f(shares, "Eigendomsverhouding kopers", BRON.klant), ".");
    if (view.kopers.some((p) => p.data.eigendom?.verhouding === "nog_niet")) b.check("Eigendomsverhouding kopers nog niet afgesproken");
  }

  b.h("Koopprijs en kwijting");
  b.p("De koopprijs van het Registergoed bedraagt ", b.f(t.koopprijs ? euro(t.koopprijs) : undefined, "Koopprijs", BRON.ko), t.roerendeZaken ? ". Daarnaast is voor de in de koop begrepen roerende zaken een bedrag van " : "", t.roerendeZaken ? b.f(euro(t.roerendeZaken), "Prijs roerende zaken", BRON.ko) : "", t.roerendeZaken ? " overeengekomen, welke roerende zaken bij deze akte, voor zover nodig, door verkoper aan koper worden geleverd" : "", ".");
  b.p("De koopprijs is voldaan door storting op een kwaliteitsrekening van mij, notaris. Verkoper verleent koper voor de betaling van de koopprijs kwijting, voor zover deze in mindering komt op het door verkoper te ontvangen bedrag volgens de nota van afrekening.");

  b.h("Verkrijging door verkoper");
  const va = d.kadaster.vorigeAkte;
  b.p("Verkoper heeft het Registergoed verkregen door de inschrijving in de openbare registers van een afschrift van een akte van levering, op ", b.f(va?.datum ? dateNl(va.datum) : undefined, "Datum verkrijgingsakte", BRON.kad), " verleden voor ", b.f(va?.notaris, "Notaris verkrijgingsakte", BRON.kad), ", welk afschrift is ingeschreven in het register Hypotheken 4, deel ", b.f(va?.deel, "Deel verkrijgingsakte", BRON.kad), " nummer ", b.f(va?.nummer, "Nummer verkrijgingsakte", BRON.kad), ".");

  b.h("Lasten en beperkingen");
  b.p("Het Registergoed wordt geleverd vrij van hypotheken, beslagen en inschrijvingen daarvan, alsmede vrij van huur- en gebruiksrechten, met uitzondering van de hierna vermelde lasten en beperkingen.");
  const regs = d.kadaster.registraties ?? [];
  const erf = regs.filter((r) => r.type === "erfdienstbaarheid");
  const kwal = regs.filter((r) => r.type === "kwalitatieve_verplichting");
  if (erf.length || kwal.length) {
    b.p("Ten aanzien van het Registergoed is in de akte van verkrijging van verkoper onder meer het volgende bepaald, welke bepalingen koper uitdrukkelijk aanvaardt:");
    for (const bep of va?.bepalingen ?? []) b.li("•", b.f(`${bep.titel}: ${bep.tekst}`, `Bepaling "${bep.titel}"`, `${BRON.akte} deel ${va?.deel} nr. ${va?.nummer}`));
    if (!(va?.bepalingen ?? []).length) for (const r of [...erf, ...kwal]) b.li("•", b.f(r.omschrijving, r.type === "erfdienstbaarheid" ? "Erfdienstbaarheid" : "Kwalitatieve verplichting", r.bron ?? BRON.kad));
    if (kwal.some((k) => /kettingbeding/i.test(k.omschrijving)) || (va?.bepalingen ?? []).some((x) => /kettingbeding/i.test(x.titel + x.tekst))) {
      b.p("Kettingbeding: ", b.check("Kettingbeding uit vorige akte doorleggen aan koper (tekst letterlijk overnemen uit akte van verkrijging)"), " Koper verbindt zich de hiervoor vermelde verplichting bij een volgende vervreemding op te leggen aan de verkrijger, op verbeurte van de in die akte genoemde boete.");
    }
  }
  const hyps = regs.filter((r) => r.type === "hypotheek");
  for (const h of hyps) b.check(`Bestaande hypotheekinschrijving ${h.partij ?? ""} (Hyp4 deel ${h.deel} nr. ${h.nummer}): aflosnota en doorhaling regelen`);
  if (regs.some((r) => r.type === "beslag")) b.check("Beslaglegging ingeschreven: nader onderzoek vereist");
  b.check(`Kadastrale recherche d.d. ${dateNl(d.kadaster.opgehaaldOp)}: her-recherche vlak vóór passeren`);

  b.h("Bepalingen uit de Koopovereenkomst");
  b.p("Partijen verklaren dat de bepalingen van de Koopovereenkomst, voor zover in deze akte niet anders is bepaald en voor zover deze na het verlijden van deze akte nog werking hebben, onverminderd tussen hen van kracht blijven. In het bijzonder geldt het volgende:");
  b.li("1.", "Feitelijke levering en risico: het Registergoed wordt heden feitelijk geleverd, leeg en ontruimd. Het Registergoed is vanaf heden voor rekening en risico van koper.");
  b.li("2.", "Zakelijke lasten: de onroerendezaakbelasting en overige zakelijke lasten worden verrekend per heden, zoals blijkt uit de nota van afrekening.");
  (t.bijzondereBepalingen ?? []).forEach((bep, i) => b.li(`${i + 3}.`, b.f(`${bep.titel}: ${bep.tekst}`, `Bijzondere bepaling "${bep.titel}"`, `${BRON.ko}${bep.page ? `, pagina ${bep.page}` : ""}`)));
  if ((t.bijzondereBepalingen ?? []).length) b.check("Bijzondere bepalingen uit koopovereenkomst zijn automatisch overgenomen: beoordelen welke na levering nog werking hebben");

  b.h("Ontbindende voorwaarden");
  b.p("Partijen verklaren dat de in de Koopovereenkomst opgenomen ontbindende voorwaarden niet zijn vervuld, dan wel dat partijen hierop geen beroep meer kunnen doen, en dat de Koopovereenkomst niet is ontbonden.");
  if (t.financieringsvoorbehoud?.datum) b.check(`Financieringsvoorbehoud tot ${dateNl(t.financieringsvoorbehoud.datum)} (${euro(t.financieringsvoorbehoud.bedrag)}): bevestigen dat het is vervallen`);
  for (const v of t.overigeVoorbehouden ?? []) b.check(`Voorbehoud "${v.omschrijving}"${v.datum ? ` tot ${dateNl(v.datum)}` : ""}: bevestigen dat het is vervallen`);

  if (needsLevering(view)) {
    b.h("Overdrachtsbelasting");
    const ob = overdrachtsbelasting(view);
    const tax = taxYearFor(t.leveringsdatum);
    for (const r of ob.regels) {
      const party = view.kopers.find((k) => k.id === r.partyId);
      const s = party?.data.starters;
      if (r.tarief === 0) {
        b.li("•", b.f(`${r.naam}`, `Koper (vrijstelling)`, BRON.klant), ` doet voor het door hem/haar verkregen aandeel (${Math.round(r.aandeel * 100)}%) een beroep op de vrijstelling van artikel 15, eerste lid, onderdeel p, van de Wet op belastingen van rechtsverkeer en heeft daartoe de voorgeschreven verklaring afgelegd, die aan deze akte wordt gehecht.`);
        if (!s?.verklaringGetekendOp) b.check(`Verklaring startersvrijstelling ${r.naam} nog niet ondertekend`);
        b.check(`Startersvrijstelling ${r.naam}: leeftijd ${s?.leeftijdOpLevering ?? "?"} op leveringsdatum, woningwaardegrens ${tax.year} € ${tax.startersGrens.toLocaleString("nl-NL")}${tax.status === "onder voorbehoud" ? " (onder voorbehoud)" : ""}, ter toetsing door de notaris`);
      } else {
        b.li("•", `${r.naam}: verschuldigd over ${Math.round(r.aandeel * 100)}% van de koopprijs, `, b.f(r.grond, `Tarief overdrachtsbelasting ${r.naam}`, BRON.sys), `, bedragende ${euro(r.bedrag)}.`);
        if (r.tarief === tax.tariefHoofdverblijf) b.p(`${r.naam} verklaart het Registergoed anders dan tijdelijk als hoofdverblijf te gaan gebruiken (artikel 14, tweede lid, Wet op belastingen van rechtsverkeer).`);
      }
    }
  }

  b.h("Woonplaatskeuze en slot");
  b.p("Partijen kiezen ter zake van de uitvoering van deze akte woonplaats ten kantore van de bewaarder van deze akte.");
  b.p(`WAARVAN AKTE, in minuut verleden te ${NOTARY_OFFICE.city} op de datum in het hoofd van deze akte vermeld. De zakelijke inhoud van de akte is aan de comparant opgegeven en toegelicht. De comparant heeft verklaard op volledige voorlezing van de akte geen prijs te stellen, tijdig voor het verlijden van de inhoud daarvan te hebben kennisgenomen en daarmee in te stemmen. Onmiddellijk na beperkte voorlezing is deze akte door de comparant en mij, notaris, ondertekend.`);

  for (const a of d.aandachtspunten.filter((x) => !x.opgelost && x.ernst !== "info")) b.check(a.tekst);
  return b.build("Concept-leveringsakte", `${propertyLine(d.property)}, dossier ${view.dossier.reference}`);
}

// ---------------------------------------------------------------------------
// Hypotheekakte
// ---------------------------------------------------------------------------

export function buildHypotheekakte(view: DossierView): DocIR {
  const b = new IRBuilder();
  const d = view.data;
  const bi = d.financing.bankinstructie ?? {};
  const bron = `${BRON.bank}${bi.kenmerk ? ` (kenmerk ${bi.kenmerk})` : ""}`;
  b.title("HYPOTHEEK");
  b.subtitle(`${bi.geldverstrekker ?? "Geldverstrekker"}, ${propertyLine(d.property)}, dossier ${view.dossier.reference}`);
  b.p("Heden, ", b.f(d.transaction.leveringsdatum ? dateNl(d.transaction.leveringsdatum) : undefined, "Passeerdatum", BRON.ko), ", verscheen voor mij, ", NOTARY_OFFICE.notaryName.replace(/ \(.*\)/, "") + `, notaris te ${NOTARY_OFFICE.city}:`);
  b.p("1. " + gevolmachtigde() + ", te dezen handelend als schriftelijk gevolmachtigde van:");
  view.kopers.forEach((p, i) => b.li("", ...comparitiePersoon(b, p, i + 1)));
  b.p(`hierna${view.kopers.length > 1 ? ", tezamen en ieder afzonderlijk," : ""} te noemen: "hypotheekgever" en ook "schuldenaar";`);
  b.p("2. ", "[NAAM MEDEWERKER], te dezen handelend als gevolmachtigde van ", b.f(bi.geldverstrekker, "Geldverstrekker", bron), `, hierna te noemen: "geldverstrekker".`);
  b.check("Volmacht geldverstrekker (doorlopende volmacht aan kantoormedewerkers) controleren");

  b.h("Schuldbekentenis");
  b.p("Schuldenaar verklaart wegens een aan hem/haar verstrekte geldlening schuldig te zijn aan geldverstrekker een bedrag van ", b.f(bi.hypotheekbedrag ? euro(bi.hypotheekbedrag) : undefined, "Hoofdsom geldlening", bron), ", waarop de bepalingen van toepassing zijn zoals vermeld in de door schuldenaar aanvaarde offerte en de hierna te noemen voorwaarden.");
  if (bi.leningdelen?.length) b.table(bi.leningdelen.map((l) => ({ label: l.soort, value: [b.f(euro(l.bedrag), `Leningdeel ${l.soort}`, bron)] })));

  b.h("Hypotheekverlening");
  b.p("Tot zekerheid voor de betaling van al hetgeen geldverstrekker blijkens de toepasselijke voorwaarden van hypotheekgever te vorderen heeft of zal hebben, verleent hypotheekgever aan geldverstrekker, die aanvaardt, het recht van ", b.f(bi.rang?.toLowerCase().replace(" in rang", "") ?? undefined, "Rangorde", bron), " hypotheek tot een bedrag van ", b.f(bi.inschrijvingsbedrag ? euro(bi.inschrijvingsbedrag) : undefined, "Inschrijvingsbedrag", bron), ", vermeerderd met renten en kosten zoals in de voorwaarden bepaald, op:");
  b.p(...objectRuns(b, view), ".");
  if (d.service !== "hypotheek") b.p("Hypotheekgever verkrijgt het onderpand bij een direct aan deze akte voorafgaande akte van levering, heden verleden voor mij, notaris.");

  b.h("Toepasselijke voorwaarden");
  b.p("Op deze hypotheekverlening zijn van toepassing de ", b.f(bi.algemeneVoorwaarden, "Algemene voorwaarden geldverstrekker", bron), ", waarvan hypotheekgever een exemplaar heeft ontvangen en die aan deze akte worden gehecht. Hypotheekgever verklaart met de inhoud daarvan bekend te zijn.");
  b.check(`Modeltekst hypotheekakte van ${bi.geldverstrekker ?? "geldverstrekker"}: verplichte bankteksten uitsluitend volgens actuele instructie/model`);

  if (bi.bijzondereVoorwaarden?.length) {
    b.h("Bijzondere voorwaarden uit de hypotheekinstructie");
    bi.bijzondereVoorwaarden.forEach((v, i) => b.li(`${i + 1}.`, b.f(v, `Bijzondere voorwaarde ${i + 1}`, bron)));
  }
  if (bi.nhg) {
    b.h("Nationale Hypotheek Garantie");
    b.p("Op de geldlening is de Nationale Hypotheek Garantie van toepassing; de daarvoor geldende voorwaarden en normen zijn van toepassing.");
    b.check("NHG: borgtochtprovisie en voorwaarden Stichting WEW controleren");
  }

  // Controles tegen dossier
  const kopersN = view.kopers.map((k) => personName(k.data.person).toLowerCase());
  for (const g of bi.geldnemers ?? []) if (!kopersN.some((k) => g.toLowerCase().includes(k.split(" ").slice(-1)[0]))) b.check(`Geldnemer "${g}" uit bankinstructie komt niet overeen met koper(s) in dossier`);
  if (bi.inschrijvingsbedrag && bi.hypotheekbedrag && bi.inschrijvingsbedrag < bi.hypotheekbedrag) b.check("Inschrijvingsbedrag is lager dan de hoofdsom");
  if (bi.uitbetalingsdatum && d.transaction.leveringsdatum && bi.uitbetalingsdatum !== d.transaction.leveringsdatum) b.check(`Passeerdatum in bankinstructie (${dateNl(bi.uitbetalingsdatum)}) wijkt af van leveringsdatum (${dateNl(d.transaction.leveringsdatum)})`);
  for (const c of bi.controlepunten ?? []) b.check(c);
  b.check("Hypotheekgelden opvragen bij geldverstrekker (getekende opgaaf benodigd bedrag)");

  b.h("Woonplaatskeuze en slot");
  b.p("Partijen kiezen ter zake van de uitvoering van deze akte woonplaats ten kantore van de bewaarder van deze akte.");
  b.p(`WAARVAN AKTE, in minuut verleden te ${NOTARY_OFFICE.city} op de datum in het hoofd van deze akte vermeld. De zakelijke inhoud van de akte is aan de comparanten opgegeven en toegelicht. De comparanten hebben verklaard op volledige voorlezing van de akte geen prijs te stellen en tijdig van de inhoud kennis te hebben genomen. Onmiddellijk na beperkte voorlezing is deze akte door de comparanten en mij, notaris, ondertekend.`);
  return b.build("Concept-hypotheekakte", `${bi.geldverstrekker ?? "Geldverstrekker"}, dossier ${view.dossier.reference}`);
}

// ---------------------------------------------------------------------------
// Volmachten
// ---------------------------------------------------------------------------

const isSigned = (p: Party) => ["ondertekend", "verwerkt"].includes(p.data.volmacht?.status ?? "");

/** Ondertekenregel: getekend met datum en wijze, of een lege regel om te tekenen. */
function sigLine(p: Party): string {
  const v = p.data.volmacht;
  if (isSigned(p) && v) return `Digitaal ondertekend door ${personName(p.data.person)}${v.ondertekendOp ? ` op ${dateNl(v.ondertekendOp)}` : ""}${v.ondertekeningMethode === "video" ? " (videoafspraak, na identificatie)" : v.ondertekeningMethode === "kantoor" ? " (op kantoor, na identificatie)" : ""}.`;
  return `Ondertekend door ${personName(p.data.person)}: ____________________   datum: __________`;
}

/** Statusregel boven de volmacht; zolang niet iedereen heeft getekend blijft het een concept. */
function signStatus(parties: Party[]): { allSigned: boolean; note?: string } {
  const signed = parties.filter(isSigned);
  if (!signed.length) return { allSigned: false };
  const open = parties.filter((p) => !isSigned(p));
  if (!open.length) return { allSigned: true, note: `Ondertekend door ${signed.map((p) => personName(p.data.person)).join(" en ")}, ter beoordeling bij de notaris.` };
  return { allSigned: false, note: `Ondertekend door ${signed.map((p) => personName(p.data.person)).join(" en ")}; ${open.map((p) => personName(p.data.person)).join(" en ")} ${open.length > 1 ? "tekenen" : "tekent"} nog.` };
}

export function buildVolmachtKoper(view: DossierView): DocIR {
  const b = new IRBuilder();
  const d = view.data;
  const lev = needsLevering(view);
  const hyp = needsHypotheek(view);
  b.title("VOLMACHT");
  b.subtitle(`${lev && hyp ? "Levering en hypotheekverlening" : lev ? "Levering" : "Hypotheekverlening"}: ${propertyLine(d.property)}`);
  const status = signStatus(view.kopers);
  if (status.note) b.note(status.note);
  b.p("De ondergetekenden:");
  view.kopers.forEach((p, i) => b.li("", ...comparitiePersoon(b, p, i + 1)));
  b.p(`hierna${view.kopers.length > 1 ? " samen" : ""} te noemen: “volmachtgever”,`);
  b.p(`verklaren bij deze volmacht te verlenen aan ${NOTARY_OFFICE.proxyHolders[0]} (${NOTARY_OFFICE.officeName}, ${NOTARY_OFFICE.city}), ieder afzonderlijk, om namens volmachtgever:`);
  let n = 1;
  if (lev) {
    b.li(`${n++}.`, "in eigendom te aanvaarden: ", ...objectRuns(b, view), ", voor een koopprijs van ", b.f(d.transaction.koopprijs ? euro(d.transaction.koopprijs) : undefined, "Koopprijs", BRON.ko), ", ter uitvoering van de koopovereenkomst d.d. ", b.f(d.transaction.datumOndertekening ? dateNl(d.transaction.datumOndertekening) : undefined, "Datum koopovereenkomst", BRON.ko), ", en daartoe de akte van levering te tekenen, met de bepalingen die de gevolmachtigde nodig of nuttig acht;");
  }
  if (hyp) {
    b.li(`${n++}.`, "ten behoeve van de geldverstrekker die blijkt uit de hypotheekinstructie die de geldverstrekker rechtstreeks aan de notaris verstrekt", d.financing.geldverstrekker ? ` (naar verwachting ${d.financing.geldverstrekker})` : "", ", een recht van hypotheek te verlenen op voormeld registergoed, tot zekerheid voor een geldlening met een hoofdsom van maximaal ", b.f(d.financing.hypotheekbedragIndicatie ?? d.transaction.financieringsvoorbehoud?.bedrag ? euro(d.financing.hypotheekbedragIndicatie ?? d.transaction.financieringsvoorbehoud?.bedrag) : undefined, "Maximale hoofdsom", BRON.klant), ", met toepasselijkheid van de algemene voorwaarden van die geldverstrekker, en daartoe de hypotheekakte te tekenen, de schuld te erkennen en alle bepalingen overeen te komen die de geldverstrekker voorschrijft;");
    b.check("Reikwijdte volmacht hypotheek: geldverstrekker/hoofdsom bij ondertekening mogelijk nog niet definitief. Tekst en reikwijdte door notaris vast te stellen");
  }
  b.li(`${n++}.`, "kwijting te geven en te ontvangen, de nota van afrekening goed te keuren, woonplaats te kiezen en verder al datgene te doen wat de gevolmachtigde ter uitvoering van deze volmacht nodig of nuttig acht.");
  b.p("De gevolmachtigde is bevoegd deze volmacht ook te gebruiken als tegenpartij van volmachtgever of als gevolmachtigde van een of meer andere partijen (onder meer de verkoper en de geldverstrekker). Deze volmacht is onherroepelijk voor zover dit voor de uitvoering nodig is en eindigt niet door de dood van volmachtgever. Op deze volmacht is Nederlands recht van toepassing.");
  b.sig(view.kopers.map(sigLine));
  b.note("Ondertekening vindt plaats tijdens een volmachtafspraak (video of op kantoor) na identificatie, volgens de door de notaris vastgestelde formaliteiten.");
  return b.build("Volmacht koper", view.dossier.reference, !status.allSigned);
}

export function buildVolmachtVerkoper(view: DossierView): DocIR {
  const b = new IRBuilder();
  const d = view.data;
  b.title("VERKOOPVOLMACHT");
  b.subtitle(propertyLine(d.property));
  const status = signStatus(view.verkopers);
  if (status.note) b.note(status.note);
  b.p("De ondergetekenden:");
  view.verkopers.forEach((p, i) => b.li("", ...comparitiePersoon(b, p, i + 1)));
  b.p(`hierna${view.verkopers.length > 1 ? " samen" : ""} te noemen: “volmachtgever”,`);
  b.p(`verklaren bij deze volmacht te verlenen aan ${NOTARY_OFFICE.proxyHolders[0]} (${NOTARY_OFFICE.officeName}, ${NOTARY_OFFICE.city}), ieder afzonderlijk, om namens volmachtgever:`);
  b.li("1.", "aan ", b.f(view.kopers.map((k) => personName(k.data.person)).join(" en ") || undefined, "Koper(s)", BRON.ko), " te leveren: ", ...objectRuns(b, view), ", voor een koopprijs van ", b.f(d.transaction.koopprijs ? euro(d.transaction.koopprijs) : undefined, "Koopprijs", BRON.ko), ", ter uitvoering van de koopovereenkomst d.d. ", b.f(d.transaction.datumOndertekening ? dateNl(d.transaction.datumOndertekening) : undefined, "Datum koopovereenkomst", BRON.ko), ", en daartoe de akte van levering te tekenen;");
  b.li("2.", "de koopprijs in ontvangst te nemen en daarvoor kwijting te verlenen, de notaris op te dragen bestaande hypothecaire schulden uit de opbrengst af te lossen en medewerking te verlenen aan doorhaling van de inschrijvingen;");
  b.li("3.", "de nota van afrekening goed te keuren, woonplaats te kiezen en verder al datgene te doen wat de gevolmachtigde ter uitvoering van deze volmacht nodig of nuttig acht.");
  b.p("De gevolmachtigde is bevoegd deze volmacht ook te gebruiken als tegenpartij van volmachtgever. Deze volmacht eindigt niet door de dood van volmachtgever. Op deze volmacht is Nederlands recht van toepassing.");
  b.sig(view.verkopers.map(sigLine));
  b.note("Indien de notaris dat vereist: handtekening laten legaliseren (bij een notaris of de gemeente) en de gelegaliseerde volmacht uploaden en origineel opsturen.");
  return b.build("Verkoopvolmacht", view.dossier.reference, !status.allSigned);
}

export function buildStartersVerklaring(view: DossierView, p: Party): DocIR {
  const b = new IRBuilder();
  const tax = taxYearFor(view.data.transaction.leveringsdatum);
  b.title("VERKLARING OVERDRACHTSBELASTING STARTERSVRIJSTELLING");
  b.subtitle("Art. 15, eerste lid, onderdeel p, Wet op belastingen van rechtsverkeer (in te vullen volgens het actuele model van de Belastingdienst)");
  b.p("Ondergetekende:");
  b.li("", ...comparitiePersoon(b, p, 1));
  b.p("verkrijgt (een aandeel van ", b.f(p.data.eigendom?.aandeel ?? `1/${view.kopers.length}`, "Aandeel", BRON.klant), " in) de woning ", b.f(propertyLine(view.data.property), "Adres woning", BRON.ko), " en verklaart dat:");
  b.li("1.", "ondergetekende op de datum van verkrijging de leeftijd van 18 jaar heeft bereikt en de leeftijd van 35 jaar nog niet heeft bereikt;");
  b.li("2.", "ondergetekende de woning anders dan tijdelijk als hoofdverblijf zal gaan gebruiken;");
  b.li("3.", "ondergetekende niet eerder een beroep heeft gedaan op de vrijstelling van artikel 15, eerste lid, onderdeel p, van de Wet op belastingen van rechtsverkeer.");
  b.p(`Woningwaardegrens voor verkrijgingen in ${tax.year}: € ${tax.startersGrens.toLocaleString("nl-NL")}${tax.status === "onder voorbehoud" ? " (onder voorbehoud)" : ""}.`);
  b.check("Gebruik het actuele door de Belastingdienst voorgeschreven model van de verklaring");
  b.sig([`Ondertekend door ${personName(p.data.person)} ____________________   datum: ${p.data.starters?.verklaringGetekendOp ? dateNl(p.data.starters.verklaringGetekendOp) : "__________"}`]);
  return b.build("Verklaring startersvrijstelling", `${personName(p.data.person)}, dossier ${view.dossier.reference}`);
}

// ---------------------------------------------------------------------------
// Nota van afrekening en aflosnota-verzoek
// ---------------------------------------------------------------------------

export function buildNota(view: DossierView, side: "koper" | "verkoper", nota: NotaState): DocIR {
  const b = new IRBuilder();
  const d = view.data;
  b.title(`NOTA VAN AFREKENING ${side.toUpperCase()}`);
  b.subtitle(`${propertyLine(d.property)}, passeerdatum ${dateNl(d.transaction.leveringsdatum)}, dossier ${view.dossier.reference}`);
  const parties = side === "koper" ? view.kopers : view.verkopers;
  b.p("Ten name van: ", parties.map((p) => personName(p.data.person)).join(" en "));
  b.table([
    ...nota.regels.map((r) => ({ label: r.label + (r.toelichting ? `: ${r.toelichting}` : ""), value: [`${r.richting === (side === "koper" ? "credit" : "debet") ? "− " : ""}${euro(r.bedrag)}`] as Run[] })),
    { label: side === "koper" ? (nota.saldo >= 0 ? "Door u te voldoen" : "Aan u uit te keren") : "Aan u uit te betalen", value: [euro(Math.abs(nota.saldo))], strong: true },
  ]);
  if (side === "koper" && nota.saldo > 0) b.p(`Wij verzoeken u het saldo tijdig over te maken naar de kwaliteitsrekening van de notaris: ${NOTARY_OFFICE.kwaliteitsrekening}, onder vermelding van ${view.dossier.reference}. De notaris geeft de uiterste datum van ontvangst aan.`);
  if (side === "koper" && nota.saldo < 0) b.p(`Het tegoed wordt na het passeren uitbetaald op ${formatIban(d.koperIban.iban)} t.n.v. ${d.koperIban.tenaamstelling ?? "[TENAAMSTELLING]"}.`);
  if (side === "verkoper") {
    const ib = view.verkopers[0]?.data.iban;
    b.p(`Uitbetaling na inschrijving van de akte en controle van de openbare registers op ${formatIban(ib?.iban) || "[IBAN]"} t.n.v. ${ib?.tenaamstelling ?? "[TENAAMSTELLING]"}${ib?.verdeling ? ` (verdeling: ${ib.verdeling})` : ""}.`);
  }
  b.note(nota.status === "definitief" ? "Definitieve nota, vastgesteld door de notaris." : "Concept: bedragen kunnen nog wijzigen tot de notaris de nota definitief vaststelt.");
  return b.build(`Nota van afrekening ${side}`, view.dossier.reference, nota.status !== "definitief");
}

export function buildAflosnotaVerzoek(view: DossierView, p: Payoff): DocIR {
  const b = new IRBuilder();
  const d = view.data;
  b.title("VERZOEK AFLOSNOTA");
  b.subtitle(`${p.lender}, onderpand ${propertyLine(d.property)}`);
  b.p(`Aan: ${p.lender}, afdeling aflossingen`);
  b.p(`Van: ${NOTARY_OFFICE.notaryName.replace(/ \(.*\)/, "")}, notaris te ${NOTARY_OFFICE.city} (${NOTARY_OFFICE.officeName})`);
  b.p("Geachte heer/mevrouw,");
  b.p("In verband met de verkoop en levering van het hierna te noemen onderpand verzoek ik u mij een aflosnota te verstrekken, geldig tot en met ten minste de passeerdatum ", b.f(d.transaction.leveringsdatum ? dateNl(d.transaction.leveringsdatum) : undefined, "Passeerdatum", BRON.ko), ", met opgave van het totaal af te lossen bedrag en uw medewerking aan doorhaling van de hypothecaire inschrijving.");
  b.table([
    { label: "Schuldenaar(s)", value: [view.verkopers.map((v) => personName(v.data.person)).join(" en ")] },
    { label: "Onderpand", value: [propertyLine(d.property)] },
    { label: "Leningnummer(s)", value: [b.f(p.loanNumbers, "Leningnummer", "Opgave verkoper")] },
    { label: "Inschrijving", value: [b.f(p.inschrijving, "Inschrijving", BRON.kad)] },
  ]);
  b.p("Schuldenaren hebben mij gemachtigd deze gegevens bij u op te vragen. Ik verzoek u de aflosnota rechtstreeks aan mij te zenden onder vermelding van ons kenmerk ", view.dossier.reference, ".");
  b.sig(["Met vriendelijke groet,", NOTARY_OFFICE.notaryName.replace(/ \(.*\)/, "")]);
  return b.build("Verzoek aflosnota", `${p.lender}, dossier ${view.dossier.reference}`, false);
}

// ---------------------------------------------------------------------------
// Koopovereenkomst (product "koopovereenkomst opstellen")
// ---------------------------------------------------------------------------

export function buildKoopovereenkomst(view: DossierView): DocIR {
  const b = new IRBuilder();
  const d = view.data;
  const t = d.transaction;
  const bron = "Vragenlijst koopovereenkomst (opgave partijen)";
  const persoon = (p: Party, i: number): Run[] => [`${i + 1}. `, b.f(personName(p.data.person), `Naam ${p.side} ${i + 1}`, bron), p.data.person.geboortedatum ? `, geboren op ${dateNl(p.data.person.geboortedatum)}` : "", p.data.person.geboorteplaats ? ` te ${p.data.person.geboorteplaats}` : "", p.data.person.adres ? `, wonende te ${[p.data.person.postcode, p.data.person.woonplaats].filter(Boolean).join(" ")}, ${p.data.person.adres}` : "", ";"];
  b.title("KOOPOVEREENKOMST WOONHUIS");
  b.subtitle(`${propertyLine(d.property)}, concept ${view.dossier.reference}`);
  b.note("Concept: wordt juridisch gecontroleerd voordat koper en verkoper digitaal tekenen.");
  b.p("DE ONDERGETEKENDEN:");
  view.verkopers.forEach((p, i) => b.li("", ...persoon(p, i)));
  b.p(`hierna${view.verkopers.length > 1 ? " samen" : ""} te noemen: "verkoper",`);
  b.p("EN");
  view.kopers.forEach((p, i) => b.li("", ...persoon(p, i)));
  b.p(`hierna${view.kopers.length > 1 ? " samen" : ""} te noemen: "koper",`);
  b.p("VERKLAREN TE ZIJN OVEREENGEKOMEN:");
  b.h("Artikel 1 – Onroerende zaak en koopprijs");
  b.p("1.1 Verkoper verkoopt aan koper, die van verkoper koopt: ", ...objectRuns(b, view), `, hierna te noemen: "de onroerende zaak".`);
  b.p("1.2 De koopprijs bedraagt ", b.f(t.koopprijs ? euro(t.koopprijs) : undefined, "Koopprijs", bron), ", kosten koper.");
  if (t.roerendeZaken) b.p("1.3 In de koop zijn begrepen de roerende zaken op de bijgevoegde lijst van zaken, waarvoor partijen een prijs van ", b.f(euro(t.roerendeZaken), "Roerende zaken", bron), " overeenkomen.");
  if (view.kopers.length > 1) b.p("1.4 Koper verkrijgt de onroerende zaak ieder voor ", b.f(view.kopers[0].data.eigendom?.aandeel ?? `1/${view.kopers.length}`, "Eigendomsverhouding", bron), " onverdeeld aandeel.");
  b.h("Artikel 2 – Notariële levering");
  b.p("2.1 De akte van levering wordt verleden ten overstaan van ", b.f(t.notarisInKo ?? `${NOTARY_OFFICE.notaryShort}, notaris te ${NOTARY_OFFICE.city}`, "Notaris", bron), ", of diens waarnemer, door koper aangewezen.");
  b.p("2.2 De levering zal plaatsvinden op ", b.f(t.leveringsdatum ? dateNl(t.leveringsdatum) : undefined, "Leveringsdatum", bron), " of zoveel eerder of later als partijen nader overeenkomen. De feitelijke levering vindt plaats bij het passeren van de akte, leeg en ontruimd.");
  b.h("Artikel 3 – Kosten en belastingen");
  b.p("3.1 De kosten van de akte van levering, de kadastrale inschrijving en de overdrachtsbelasting zijn voor rekening van koper. De zakelijke lasten worden per de dag van levering verrekend.");
  b.h("Artikel 4 – Waarborgsom of bankgarantie");
  b.p("4.1 Koper zal uiterlijk op ", b.f(t.waarborgsom?.uiterlijk ? dateNl(t.waarborgsom.uiterlijk) : undefined, "Uiterste datum waarborgsom", bron), ` bij de notaris een ${t.waarborgsom?.type === "bankgarantie" ? "bankgarantie stellen" : "waarborgsom storten"} van `, b.f(t.waarborgsom?.bedrag ? euro(t.waarborgsom.bedrag) : undefined, "Waarborgsom", bron), ".");
  b.h("Artikel 5 – Ontbindende voorwaarden");
  if (t.financieringsvoorbehoud?.bedrag) b.p("5.1 Financieringsvoorbehoud: koper kan deze overeenkomst ontbinden indien hij uiterlijk op ", b.f(t.financieringsvoorbehoud.datum ? dateNl(t.financieringsvoorbehoud.datum) : undefined, "Datum financieringsvoorbehoud", bron), " voor een bedrag van ", b.f(euro(t.financieringsvoorbehoud.bedrag), "Bedrag financiering", bron), ` geen hypothecaire geldlening heeft verkregen${t.financieringsvoorbehoud.nhg ? " onder Nationale Hypotheek Garantie" : ""}. Koper zal zich naar beste vermogen inspannen de financiering te verkrijgen en desgevraagd twee afwijzingen overleggen.`);
  (t.overigeVoorbehouden ?? []).forEach((v, i) => b.p(`5.${i + 2} ${v.omschrijving}: koper kan deze overeenkomst ontbinden indien uiterlijk op `, b.f(v.datum ? dateNl(v.datum) : undefined, v.omschrijving, bron), " niet aan deze voorwaarde is voldaan."));
  if (!t.financieringsvoorbehoud?.bedrag && !(t.overigeVoorbehouden ?? []).length) b.p("5.1 Partijen zijn geen ontbindende voorwaarden overeengekomen. ", b.check("Bewust geen financieringsvoorbehoud: koper hierop wijzen"));
  b.h("Artikel 6 – Staat en gebruik");
  b.p("6.1 De onroerende zaak wordt geleverd in de staat waarin zij zich bij het tot stand komen van deze overeenkomst bevindt, vrij van huur, hypotheken en beslagen. Verkoper staat ervoor in dat de onroerende zaak bij de levering de feitelijke eigenschappen bezit die nodig zijn voor normaal gebruik als woning.");
  b.h("Artikel 7 – Bedenktijd");
  b.p("7.1 Koper heeft het recht gedurende drie dagen na terhandstelling van de door partijen ondertekende overeenkomst deze te ontbinden (artikel 7:2 BW).");
  b.h("Artikel 8 – Ingebrekestelling en boete");
  b.p("8.1 Indien een partij, na in gebreke te zijn gesteld, tekortschiet in de nakoming, is zij aan de wederpartij een direct opeisbare boete verschuldigd van drie promille van de koopprijs per dag, met een maximum van tien procent van de koopprijs, onverminderd het recht op nakoming of ontbinding.");
  if ((t.bijzondereBepalingen ?? []).length) {
    b.h("Artikel 9 – Bijzondere afspraken");
    (t.bijzondereBepalingen ?? []).forEach((bep, i) => b.p(`9.${i + 1} `, b.f(bep.tekst, `Bijzondere afspraak ${i + 1}`, bron)));
    b.check("Bijzondere afspraken juridisch formuleren en toetsen");
  }
  b.h("Ondertekening");
  b.sig([...view.verkopers.map((p) => `Verkoper: ${personName(p.data.person)} ____________________`), ...view.kopers.map((p) => `Koper: ${personName(p.data.person)} ____________________`)]);
  b.check("Juridische controle concept vóór verzending ter ondertekening");
  return b.build("Concept-koopovereenkomst", view.dossier.reference, false);
}
