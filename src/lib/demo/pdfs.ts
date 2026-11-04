import "server-only";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { DEMO, demoDates } from "./scenario";
import { dateNl, euro } from "@/lib/util/format";

/**
 * Genereert de fictieve demodocumenten als echte PDF's (met tekstlaag), zodat de
 * scanner er echt gegevens uit kan lezen. Elk document is gemarkeerd als DEMO.
 */

const A4: [number, number] = [595.28, 841.89];
/** Standaard-PDF-fonts ondersteunen alleen WinAnsi; vervang tekens daarbuiten. */
const safe = (s: string) => s.replace(/\u2212/g, "-").replace(/[\u2009\u202f\u00a0]/g, " ").replace(/[\u2010\u2011]/g, "-").replace(/[^\x00-\xff\u20ac\u2013\u2014\u2018\u2019\u201c\u201d\u2022\u2026\u0152\u0153\u0160\u0161\u0178\u017d\u017e\u0192\u02c6\u02dc\u2020\u2021\u2030\u2039\u203a\u2122\u201a\u201e]/g, "?");
const M = 56;

class Writer {
  doc!: PDFDocument;
  page!: PDFPage;
  font!: PDFFont;
  bold!: PDFFont;
  serif!: PDFFont;
  serifBold!: PDFFont;
  y = 0;
  pageNo = 0;
  constructor(private header: string, private useSerif = false) {}
  async init() {
    this.doc = await PDFDocument.create();
    this.font = await this.doc.embedFont(StandardFonts.Helvetica);
    this.bold = await this.doc.embedFont(StandardFonts.HelveticaBold);
    this.serif = await this.doc.embedFont(StandardFonts.TimesRoman);
    this.serifBold = await this.doc.embedFont(StandardFonts.TimesRomanBold);
    this.doc.setProducer("Akteloket demo");
    this.doc.setCreator("Akteloket demo");
    this.newPage();
    return this;
  }
  get body() { return this.useSerif ? this.serif : this.font; }
  get bodyBold() { return this.useSerif ? this.serifBold : this.bold; }
  newPage() {
    this.page = this.doc.addPage(A4);
    this.pageNo++;
    this.y = A4[1] - M;
    this.page.drawText(`DEMO — FICTIEF VOORBEELDDOCUMENT · ${this.header}`, { x: M, y: A4[1] - 28, size: 7, font: this.bold, color: rgb(0.75, 0.3, 0.1) });
    this.page.drawText(`Pagina ${this.pageNo}`, { x: A4[0] - M - 40, y: 24, size: 8, font: this.font, color: rgb(0.45, 0.45, 0.5) });
  }
  ensure(h: number) { if (this.y - h < M) this.newPage(); }
  text(raw: string, o: { size?: number; bold?: boolean; indent?: number; gap?: number; color?: [number, number, number]; font?: PDFFont } = {}) {
    const t = safe(raw);
    const size = o.size ?? 10.5;
    const font = o.font ?? (o.bold ? this.bodyBold : this.body);
    const maxW = A4[0] - 2 * M - (o.indent ?? 0);
    const lines: string[] = [];
    for (const para of t.split("\n")) {
      const words = para.split(" ");
      let line = "";
      for (const w of words) {
        const test = line ? line + " " + w : w;
        if (font.widthOfTextAtSize(test, size) > maxW && line) { lines.push(line); line = w; } else line = test;
      }
      lines.push(line);
    }
    for (const l of lines) {
      this.ensure(size * 1.45);
      this.page.drawText(l, { x: M + (o.indent ?? 0), y: this.y - size, size, font, color: o.color ? rgb(...o.color) : rgb(0.08, 0.1, 0.2) });
      this.y -= size * 1.45;
    }
    this.y -= o.gap ?? 4;
  }
  heading(t: string, size = 12) { this.y -= 6; this.text(t, { size, bold: true, gap: 4 }); }
  kv(kRaw: string, vRaw: string, w = 170) {
    const k = safe(kRaw);
    const v = safe(vRaw);
    this.ensure(15);
    this.page.drawText(k, { x: M, y: this.y - 10, size: 9.5, font: this.font, color: rgb(0.35, 0.37, 0.5) });
    const maxW = A4[0] - 2 * M - w;
    const words = v.split(" "); let line = ""; const lines: string[] = [];
    for (const wd of words) { const test = line ? line + " " + wd : wd; if (this.bold.widthOfTextAtSize(test, 9.5) > maxW && line) { lines.push(line); line = wd; } else line = test; }
    lines.push(line);
    lines.forEach((l, i) => this.page.drawText(l, { x: M + w, y: this.y - 10 - i * 13, size: 9.5, font: this.bold, color: rgb(0.08, 0.1, 0.2) }));
    this.y -= Math.max(15, lines.length * 13 + 2);
  }
  rule() { this.ensure(10); this.page.drawLine({ start: { x: M, y: this.y - 4 }, end: { x: A4[0] - M, y: this.y - 4 }, thickness: 0.6, color: rgb(0.8, 0.82, 0.88) }); this.y -= 12; }
  space(h = 8) { this.y -= h; }
  async save() { return Buffer.from(await this.doc.save()); }
}

const fmtPerson = (p: (typeof DEMO.kopers)[number] | (typeof DEMO.verkopers)[number]) =>
  `${p.voornamen} ${p.achternaam}, geboren te ${p.geboorteplaats} op ${dateNl(p.geboortedatum)}, wonende te ${p.postcode} ${p.woonplaats}, ${p.adres}`;

export async function koopovereenkomstPdf(): Promise<Buffer> {
  const d = demoDates();
  const w = await new Writer("Koopovereenkomst Bloesemlaan 14").init();
  w.text("KOOPOVEREENKOMST WOONHUIS", { size: 17, bold: true, gap: 2 });
  w.text("Bestaande eengezinswoning — opgesteld naar de gangbare indeling van een koopovereenkomst", { size: 9, color: [0.4, 0.42, 0.55], gap: 14 });
  w.text("DE ONDERGETEKENDEN:", { bold: true });
  DEMO.verkopers.forEach((v, i) => w.text(`${i + 1}. ${fmtPerson(v)}, ${v.burgerlijkeStaat === "gehuwd" ? "gehuwd" : v.burgerlijkeStaat}${v.partnerNaam ? ` met ${v.partnerNaam}` : ""};`, { indent: 12 }));
  w.text("hierna samen te noemen: \"verkoper\",", { gap: 8 });
  w.text("EN", { bold: true });
  DEMO.kopers.forEach((k, i) => w.text(`${i + 1}. ${fmtPerson(k)}, ongehuwd en niet geregistreerd als partner;`, { indent: 12 }));
  w.text("hierna samen te noemen: \"koper\",", { gap: 10 });
  w.text("VERKLAREN TE ZIJN OVEREENGEKOMEN:", { bold: true, gap: 8 });

  w.heading("Artikel 1 — Onroerende zaak, koopprijs");
  w.text(`1.1 Verkoper verkoopt aan koper, die van verkoper koopt: de woning met ondergrond, tuin en berging, plaatselijk bekend als ${DEMO.property.straat} ${DEMO.property.huisnummer}, ${DEMO.property.postcode} ${DEMO.property.plaats}, kadastraal bekend als gemeente ${DEMO.property.kadastraal.gemeente}, sectie ${DEMO.property.kadastraal.sectie}, nummer ${DEMO.property.kadastraal.perceel}, groot ${DEMO.property.kadastraal.grootte}, hierna te noemen: "de onroerende zaak".`);
  w.text(`1.2 De koopprijs van de onroerende zaak bedraagt ${euro(DEMO.koopprijs)} (zegge: vierhonderdvijfentachtigduizend euro), kosten koper.`);
  w.text(`1.3 Partijen verklaren dat in de koop zijn begrepen de roerende zaken genoemd in de bij deze koopovereenkomst behorende lijst van zaken. De koopprijs van de roerende zaken bedraagt ${euro(DEMO.roerendeZaken)}.`);
  w.text("1.4 Koper verkrijgt de onroerende zaak ieder voor de onverdeelde helft (1/2).");

  w.heading("Artikel 2 — Kosten en belastingen");
  w.text("2.1 De kosten van de akte van levering, de inschrijvingskosten en de overdrachtsbelasting zijn voor rekening van koper.");
  w.text("2.2 De onroerendezaakbelasting, de waterschapslasten en andere zakelijke lasten worden tussen partijen verrekend per de dag van de eigendomsoverdracht.");

  w.heading("Artikel 3 — Notariële akte van levering");
  w.text(`3.1 De akte van levering zal worden verleden ten overstaan van ${DEMO.notarisInKo}, of diens waarnemer.`);
  w.text(`3.2 De levering zal plaatsvinden op ${dateNl(d.levering)}, of zoveel eerder of later als partijen nader overeenkomen.`);
  w.text("3.3 De feitelijke levering (sleuteloverdracht) vindt plaats bij het passeren van de akte van levering, leeg en ontruimd.");

  w.heading("Artikel 4 — Waarborgsom of bankgarantie");
  w.text(`4.1 Koper zal uiterlijk op ${dateNl(d.waarborgsomUiterlijk)} ten behoeve van verkoper bij de notaris een waarborgsom storten ter grootte van ${euro(DEMO.waarborgsom)}, zijnde tien procent (10%) van de koopprijs, dan wel een bankgarantie stellen voor hetzelfde bedrag.`);

  w.heading("Artikel 5 — Ontbindende voorwaarden");
  w.text(`5.1 Financieringsvoorbehoud: deze koopovereenkomst kan door koper worden ontbonden indien koper uiterlijk op ${dateNl(d.financiering)} voor de verwerving van de onroerende zaak voor een bedrag van ${euro(DEMO.financieringBedrag)} geen hypothecaire geldlening heeft verkregen bij een erkende geldverstrekker.`);
  w.text(`5.2 Bouwkundige keuring: deze koopovereenkomst kan door koper worden ontbonden indien uit een bouwkundige keuring, uit te voeren uiterlijk op ${dateNl(d.keuring)}, blijkt dat de herstelkosten van gebreken meer dan € 10.000,00 bedragen.`);

  w.heading("Artikel 6 — Staat van de onroerende zaak, lasten en beperkingen");
  w.text("6.1 De onroerende zaak zal aan koper in eigendom worden overgedragen vrij van hypotheken en beslagen en inschrijvingen daarvan, en vrij van huur of andere gebruiksrechten.");
  w.text("6.2 Verkoper verklaart dat hem, behoudens de hierna onder bijzondere bepalingen vermelde erfdienstbaarheid en de kwalitatieve verplichting genoemd in de akte van 30 juni 2011, geen lasten en beperkingen bekend zijn die niet uit de openbare registers blijken.");

  w.heading("Artikel 7 — Bedenktijd");
  w.text(`7.1 Koper heeft het recht gedurende drie dagen na terhandstelling van de door partijen ondertekende koopovereenkomst deze te ontbinden (bedenktijd). De bedenktijd eindigt op ${dateNl(d.bedenktijdEinde)}.`);

  w.heading("Artikel 8 — Bijzondere bepalingen");
  DEMO.bijzondereBepalingen.forEach((b, i) => w.text(`8.${i + 1} ${b.titel}: ${b.tekst}`));

  w.heading("Artikel 9 — Makelaar");
  w.text(`9.1 Deze koop is tot stand gekomen door bemiddeling van ${DEMO.makelaarVerkoper}, makelaar van verkoper.`);

  w.heading("Ondertekening");
  w.text(`Aldus opgemaakt en ondertekend te Amersfoort op ${dateNl(d.ondertekening)}.`, { gap: 18 });
  w.text("Verkoper:                                                                    Koper:", { bold: true, gap: 26 });
  w.text("H.J. Jansen          M.E. Visser                                       S.M. de Vries          D.P. Bakker", { size: 9, color: [0.3, 0.32, 0.45], gap: 18 });

  w.newPage();
  w.heading("Bijlage — Lijst van zaken (samenvatting)");
  [["Zonnepanelen (10 stuks) met omvormer", "blijft achter"], ["Keukenapparatuur (inbouw)", "blijft achter"], ["Raambekleding woonkamer", "blijft achter"], ["Tuinhuis", "blijft achter"], ["Wasmachine", "gaat mee"]].forEach(([a, b]) => w.kv(a, b, 300));
  w.space(10);
  w.text(`Contactgegevens verkoper: ${DEMO.verkopers[0].email}, ${DEMO.verkopers[0].phone} · ${DEMO.verkopers[1].email}`, { size: 9 });
  w.text(`Contactgegevens koper: ${DEMO.kopers[0].email}, ${DEMO.kopers[0].phone} · ${DEMO.kopers[1].email}`, { size: 9 });
  return w.save();
}

export interface EigendomPdfInput {
  kenmerk: string;
  aanduiding: { gemeente?: string; sectie?: string; perceel?: string; appartementsindex?: string; grootte?: string; grootteM2?: number };
  locatie: string;
  rechthebbenden: { naam: string; recht: string; aandeel?: string; geboortedatum?: string }[];
  verkrijging?: string;
  registraties: { type: string; omschrijving: string }[];
}

export async function kadasterEigendomPdf(input?: EigendomPdfInput): Promise<Buffer> {
  const k = DEMO.kadaster;
  const data: EigendomPdfInput = input ?? {
    kenmerk: k.kenmerk,
    aanduiding: DEMO.property.kadastraal,
    locatie: `${DEMO.property.straat} ${DEMO.property.huisnummer}, ${DEMO.property.postcode} ${DEMO.property.plaats}`,
    rechthebbenden: k.rechthebbenden,
    verkrijging: `Akte van levering ${dateNl(k.vorigeAkte.datum)}, Hyp4 deel ${k.vorigeAkte.deel} nummer ${k.vorigeAkte.nummer}`,
    registraties: [
      { type: "Hypotheek", omschrijving: `${k.hypotheek.partij}, ingeschreven ${dateNl(k.hypotheek.datum)}, Hyp4 deel ${k.hypotheek.deel} nummer ${k.hypotheek.nummer}, bedrag ${euro(k.hypotheek.bedrag)}` },
      { type: "Beslag", omschrijving: "Geen inschrijvingen van beslag aanwezig" },
      { type: "Erfdienstbaarheid", omschrijving: k.erfdienstbaarheid },
      { type: "Kwalitatieve verplichting", omschrijving: k.kwalitatief },
      { type: "Publiekrechtelijke beperkingen", omschrijving: "Geen beperkingen bekend in de Landelijke Voorziening WKPB (demo)" },
      { type: "Aantekeningen", omschrijving: "Geen" },
    ],
  };
  const w = await new Writer("Kadastrale eigendomsinformatie").init();
  w.text("Eigendomsinformatie perceel", { size: 16, bold: true, gap: 2 });
  w.text(`Fictief demobericht in de opbouw van een kadastraal bericht · Kenmerk ${data.kenmerk} · Raadpleegdatum ${dateNl(new Date())}`, { size: 8.5, color: [0.4, 0.42, 0.55], gap: 14 });
  w.heading("Kadastraal object");
  const a = data.aanduiding;
  w.kv("Kadastrale aanduiding", `${a.gemeente ?? "?"} ${a.sectie ?? "?"} ${a.perceel ?? "?"}${a.appartementsindex ? " A" + a.appartementsindex : ""}`);
  if (a.grootte) w.kv("Grootte", `${a.grootte}${a.grootteM2 ? ` (${a.grootteM2} m²)` : ""}`);
  w.kv("Locatie", data.locatie);
  w.kv("Omschrijving", "Wonen");
  w.rule();
  w.heading("Gerechtigden");
  data.rechthebbenden.forEach((r) => { w.kv("Naam", r.naam); w.kv("Recht", `${r.recht}${r.aandeel ? ` — aandeel ${r.aandeel}` : ""}`); if (r.geboortedatum) w.kv("Geboortedatum", dateNl(r.geboortedatum)); w.space(4); });
  if (data.verkrijging) w.kv("Verkrijging", data.verkrijging);
  w.rule();
  w.heading("Stukken en inschrijvingen");
  data.registraties.forEach((r) => w.kv(r.type, r.omschrijving));
  return w.save();
}

export async function kadasterKaartPdf(): Promise<Buffer> {
  const w = await new Writer("Kadastrale kaart").init();
  w.text("Uittreksel kadastrale kaart", { size: 16, bold: true, gap: 2 });
  w.text(`Fictieve demokaart · ${DEMO.property.kadastraal.gemeente} ${DEMO.property.kadastraal.sectie} ${DEMO.property.kadastraal.perceel} · schaal ca. 1:500`, { size: 8.5, color: [0.4, 0.42, 0.55], gap: 10 });
  const p = w.page;
  const ox = 90, oy = 300, cw = 70, ch = 200;
  p.drawRectangle({ x: 60, y: 230, width: 475, height: 360, borderColor: rgb(0.75, 0.78, 0.86), borderWidth: 0.8 });
  p.drawRectangle({ x: 60, y: oy + ch, width: 475, height: 40, color: rgb(0.94, 0.94, 0.96) });
  p.drawText("BLOESEMLAAN", { x: 240, y: oy + ch + 15, size: 10, font: w.bold, color: rgb(0.4, 0.42, 0.55) });
  const nrs = ["4818", "4819", "4820", "4821", "4822", "4823"];
  const huis = ["8", "10", "12", "14", "16", "18"];
  nrs.forEach((n, i) => {
    const x = ox + i * cw;
    const isObj = n === "4821";
    p.drawRectangle({ x, y: oy, width: cw, height: ch, borderColor: rgb(0.2, 0.22, 0.35), borderWidth: isObj ? 2 : 0.8, color: isObj ? rgb(1, 0.95, 0.8) : undefined });
    p.drawRectangle({ x: x + 8, y: oy + ch - 78, width: cw - 16, height: 70, borderColor: rgb(0.45, 0.45, 0.55), borderWidth: 0.6 });
    p.drawText(n, { x: x + 20, y: oy + 90, size: 10, font: isObj ? w.bold : w.font, color: rgb(0.1, 0.1, 0.3) });
    p.drawText(huis[i], { x: x + 28, y: oy + ch - 50, size: 8, font: w.font, color: rgb(0.4, 0.4, 0.5) });
  });
  p.drawLine({ start: { x: ox, y: oy + 22 }, end: { x: ox + 6 * cw, y: oy + 22 }, thickness: 1, color: rgb(0.7, 0.35, 0.1), dashArray: [4, 3] });
  p.drawText("achterpad (erfdienstbaarheid van overpad)", { x: ox + 120, y: oy + 8, size: 8, font: w.font, color: rgb(0.7, 0.35, 0.1) });
  w.y = 210;
  w.text("Het gemarkeerde perceel is het verkochte. De stippellijn geeft indicatief het achterpad weer waarover de erfdienstbaarheid van overpad loopt. Aan deze demokaart kunnen geen rechten worden ontleend.", { size: 9 });
  return w.save();
}

export async function vorigeAktePdf(): Promise<Buffer> {
  const k = DEMO.kadaster;
  const w = await new Writer("Vorige leveringsakte (uittreksel)", true).init();
  w.text("LEVERING", { size: 15, bold: true, gap: 2 });
  w.text(`Uittreksel uit akte van ${dateNl(k.vorigeAkte.datum)}, ingeschreven Hyp4 deel ${k.vorigeAkte.deel} nummer ${k.vorigeAkte.nummer} — fictief demodocument`, { size: 9, color: [0.4, 0.42, 0.55], gap: 12 });
  w.text(`Op dertig juni tweeduizend elf verschenen voor mij, ${k.vorigeAkte.notaris}: ... (verkoper in 2011) en de heer Hendrikus Johannes Jansen en mevrouw Maria Elisabeth Visser, hierna samen te noemen: "koper".`);
  w.heading("Erfdienstbaarheden", 11.5);
  w.text("Ten laste van het verkochte als lijdend erf en ten behoeve van de percelen kadastraal bekend gemeente Amersfoort sectie K nummers 4820 en 4822 als heersende erven, wordt bij deze gevestigd een erfdienstbaarheid van overpad, inhoudende de bevoegdheid om te voet en met de fiets over het achterpad te gaan en te staan, ter breedte van ten hoogste één meter twintig centimeter, ter plaatse als op de aan deze akte gehechte tekening aangegeven.");
  w.heading("Kwalitatieve verplichting en kettingbeding", 11.5);
  w.text("Koper verbindt zich om de gemeenschappelijke erfafscheiding aan de achterzijde van het verkochte in goede staat te onderhouden en in stand te houden. Deze verplichting zal op grond van artikel 6:252 van het Burgerlijk Wetboek ook gelden voor degenen die het verkochte onder bijzondere titel zullen verkrijgen. Voor zover deze verplichting niet als kwalitatieve verplichting kan gelden, verbindt koper zich deze verplichting bij iedere vervreemding van het verkochte als kettingbeding op te leggen aan de verkrijger, op straffe van een boete van vijfduizend euro (€ 5.000,00).");
  w.heading("Overige bepalingen", 11.5);
  w.text("Koper verklaart bekend te zijn met de ligging van de kabels en leidingen van nutsbedrijven en aanvaardt de daaruit voortvloeiende beperkingen.");
  return w.save();
}

export interface BankPdfInput {
  geldverstrekker: string; kenmerk: string; notaris: string;
  geldnemers: { naam: string; geboortedatum?: string }[];
  onderpand: string; hoofdsom: number; inschrijving: number;
  leningdelen: { soort: string; bedrag: number }[]; voorwaarden: string; passeerdatum?: string; nhg?: boolean;
}

export async function bankinstructiePdf(input?: BankPdfInput): Promise<Buffer> {
  const d = demoDates();
  const b = DEMO.bank;
  const x: BankPdfInput = input ?? {
    geldverstrekker: b.naam, kenmerk: b.kenmerk, notaris: DEMO.notarisInKo,
    geldnemers: DEMO.kopers.map((k) => ({ naam: `${k.voornamen} ${k.achternaam}`, geboortedatum: k.geboortedatum })),
    onderpand: `${DEMO.property.straat} ${DEMO.property.huisnummer}, ${DEMO.property.postcode} ${DEMO.property.plaats}, kadastraal ${DEMO.property.kadastraal.gemeente} ${DEMO.property.kadastraal.sectie} ${DEMO.property.kadastraal.perceel}`,
    hoofdsom: b.hypotheekbedrag, inschrijving: b.inschrijving, leningdelen: b.leningdelen, voorwaarden: b.voorwaarden, passeerdatum: d.levering, nhg: false,
  };
  const w = await new Writer("Hypotheekinstructie geldverstrekker").init();
  w.text(x.geldverstrekker, { size: 14, bold: true, gap: 2 });
  w.text("Afdeling Notariële Zaken · Postbus 1000, 9700 AA Groningen (fictief)", { size: 8.5, color: [0.4, 0.42, 0.55], gap: 16 });
  w.text("HYPOTHEEKINSTRUCTIE / OPDRACHT TOT HET OPMAKEN VAN DE HYPOTHEEKAKTE", { size: 12, bold: true, gap: 10 });
  w.kv("Aan", x.notaris);
  w.kv("Ons kenmerk", x.kenmerk);
  w.kv("Datum", dateNl(new Date()));
  w.rule();
  x.geldnemers.forEach((g, i) => w.kv(`Geldnemer ${i + 1}`, `${g.naam}${g.geboortedatum ? `, geboren ${dateNl(g.geboortedatum)}` : ""}`));
  w.kv("Hypotheekgever(s)", x.geldnemers.length > 1 ? x.geldnemers.map((_, i) => `geldnemer ${i + 1}`).join(" en ").replace(/^g/, "G") : "Geldnemer 1");
  w.kv("Onderpand", x.onderpand);
  w.rule();
  w.kv("Hoofdsom lening", euro(x.hoofdsom));
  x.leningdelen.forEach((l, i) => w.kv(`Leningdeel ${i + 1}`, `${l.soort}: ${euro(l.bedrag)}`));
  w.kv("Inschrijvingsbedrag", `${euro(x.inschrijving)} (hoofdsom vermeerderd met renten en kosten)`);
  w.kv("Rangorde", "Eerste in rang");
  w.kv("Nationale Hypotheek Garantie", x.nhg ? "Ja" : "Nee");
  w.kv("Bouwdepot", "Geen");
  w.kv("Toepasselijke voorwaarden", x.voorwaarden);
  if (x.passeerdatum) w.kv("Geplande passeerdatum", dateNl(x.passeerdatum));
  w.rule();
  w.heading("Bijzondere voorwaarden", 11);
  w.text("1. In de akte dient te worden opgenomen dat het hypotheekrecht mede strekt tot zekerheid voor al hetgeen de geldverstrekker uit welken hoofde ook van de schuldenaar te vorderen heeft of zal hebben (bankhypotheek).");
  w.text("2. De hypotheekgevers verlenen de geldverstrekker een recht van pand op de rechten uit de opstalverzekering en de huurpenningen.");
  w.text("3. De hypotheekgelden worden uiterlijk drie werkdagen vóór de passeerdatum op de kwaliteitsrekening van de notaris gestort, na ontvangst van een getekende opgaaf van het benodigde bedrag.");
  w.space(8);
  w.text("Deze instructie is uitsluitend bestemd voor de notaris. De notaris draagt zorg voor de juiste opneming van de verplichte bepalingen van de geldverstrekker.", { size: 9, color: [0.4, 0.42, 0.55] });
  return w.save();
}

export async function aflosnotaPdf(): Promise<Buffer> {
  const d = demoDates();
  const k = DEMO.kadaster;
  const w = await new Writer("Aflosnota").init();
  w.text(k.hypotheek.partij, { size: 14, bold: true, gap: 2 });
  w.text("Team Aflossingen · fictief", { size: 8.5, color: [0.4, 0.42, 0.55], gap: 16 });
  w.text("AFLOSNOTA", { size: 13, bold: true, gap: 8 });
  w.kv("Aan", DEMO.notarisInKo);
  w.kv("Schuldenaren", "H.J. Jansen en M.E. Visser");
  w.kv("Leningnummer", DEMO.aflosnota.leningnummer);
  w.kv("Onderpand", `${DEMO.property.straat} ${DEMO.property.huisnummer}, ${DEMO.property.plaats}`);
  w.kv("Inschrijving", `Hyp4 deel ${k.hypotheek.deel} nummer ${k.hypotheek.nummer}`);
  w.rule();
  w.kv("Restant hoofdsom", euro(DEMO.aflosnota.bedrag - 412.5));
  w.kv("Lopende rente t/m aflosdatum", euro(412.5));
  w.kv("Vergoeding vervroegde aflossing", euro(DEMO.aflosnota.boete));
  w.kv("Totaal af te lossen", euro(DEMO.aflosnota.bedrag));
  w.kv("Geldig tot en met", dateNl(d.levering));
  w.rule();
  w.text("Na ontvangst van het totaalbedrag verlenen wij medewerking aan de doorhaling (royement) van de hypothecaire inschrijving.", { size: 9.5 });
  return w.save();
}

export async function bankafschriftPdf(): Promise<Buffer> {
  const w = await new Writer("Rekeningafschrift spaarrekening").init();
  w.text("Rekeningoverzicht spaarrekening", { size: 14, bold: true, gap: 2 });
  w.text("Fictieve bank · demodocument", { size: 8.5, color: [0.4, 0.42, 0.55], gap: 14 });
  w.kv("Rekeninghouders", "S.M. de Vries en D.P. Bakker");
  w.kv("Rekening", "NL00 DEMO 0123 4567 89");
  w.kv("Saldo per vandaag", euro(35000 + 48500 + 1250));
  w.rule();
  [["Maandelijkse inleg (salaris)", "+ € 750,00"], ["Maandelijkse inleg (salaris)", "+ € 650,00"], ["Storting waarborgsom notaris", "− € 48.500,00"], ["Rente", "+ € 41,22"]].forEach(([a, b]) => w.kv(a, b, 300));
  return w.save();
}

export async function schenkingPdf(): Promise<Buffer> {
  const w = await new Writer("Schenkingsovereenkomst").init();
  w.text("Schenkingsovereenkomst", { size: 14, bold: true, gap: 10 });
  w.text("De ondergetekenden A. de Vries en J. de Vries-Mulder (schenkers) en S.M. de Vries (begiftigde) verklaren dat schenkers aan begiftigde schenken een bedrag van € 25.000,00, ten behoeve van de aankoop van de woning Bloesemlaan 14 te Amersfoort. Aan de schenking zijn geen voorwaarden verbonden. Het bedrag is afkomstig van de spaarrekening van schenkers.");
  w.space(16);
  w.text("Plaats/datum: Groningen — handtekeningen schenkers en begiftigde (demo)", { size: 9 });
  return w.save();
}

export async function genericKoPdf(input: { adres: string; postcode: string; plaats: string; koopprijs: number; koper: string; verkoper: string; levering: string }): Promise<Buffer> {
  const w = await new Writer(`Koopovereenkomst ${input.adres}`).init();
  w.text("KOOPOVEREENKOMST WOONHUIS", { size: 17, bold: true, gap: 12 });
  w.text(`Verkoper: ${input.verkoper}`);
  w.text(`Koper: ${input.koper}`);
  w.text(`De onroerende zaak plaatselijk bekend als ${input.adres}, ${input.postcode} ${input.plaats}. De koopprijs bedraagt ${euro(input.koopprijs)}. De levering zal plaatsvinden op ${dateNl(input.levering)}.`);
  return w.save();
}
