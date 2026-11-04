/**
 * Domeintypes voor Akteloket. De dossier- en partijgegevens worden als JSON
 * opgeslagen (jsonb) zodat het datamodel tijdens de pilot snel kan meebewegen
 * met de feedback van de notaris, terwijl de typering in de code strak blijft.
 */

import type { ServiceKey } from "@/lib/config";

export type Side = "koper" | "verkoper";
export type Role = "klant" | "notaris" | "beheer";

export type FieldSource = "koopovereenkomst" | "klant" | "kadaster" | "pdok" | "idcheck" | "bankinstructie" | "notaris" | "systeem";

/** Herkomst en zekerheid van één gegeven — zo kan de notaris altijd terugzien waar iets vandaan komt. */
export interface FieldMeta {
  source: FieldSource;
  page?: number;
  confidence?: number; // 0..1
  snippet?: string;
  confirmedBy?: string;
  confirmedAt?: string;
  changedFrom?: string;
}

export type BurgerlijkeStaat = "ongehuwd" | "gehuwd" | "geregistreerd_partner" | "gescheiden" | "weduwe";
export type JaNee = "ja" | "nee";
export type JaNeeWeetNiet = "ja" | "nee" | "weet_niet";

export interface PersonData {
  voornamen?: string;
  achternaam?: string;
  roepnaam?: string;
  geboortedatum?: string; // ISO yyyy-mm-dd
  geboorteplaats?: string;
  nationaliteit?: string;
  adres?: string;
  postcode?: string;
  woonplaats?: string;
  burgerlijkeStaat?: BurgerlijkeStaat;
  heeftPartner?: JaNee;
  partnerNaam?: string;
  partnerDatum?: string;
  huwelijkseVoorwaarden?: JaNeeWeetNiet;
  beroep?: string;
}

export interface EigendomData {
  alleenOfSamen?: "alleen" | "een_ander" | "meerdere";
  verhouding?: "gelijk" | "anders" | "nog_niet";
  aandeel?: string; // bijv. "1/2" of "60%"
  privéOfOnderneming?: "prive" | "onderneming";
  bevestigd?: boolean;
}

export interface StartersData {
  preselectie?: "mogelijk" | "niet" | "onbekend";
  reden?: string;
  leeftijdOpLevering?: number;
  hoofdverblijf?: JaNee;
  eerderGebruikt?: "nee" | "ja" | "weet_niet";
  wilGebruiken?: JaNee;
  verklaringGetekendOp?: string;
  uitkomst?: "vrijstelling" | "2%" | "8%" | "controle_notaris";
  controlepunt?: string;
}

export interface PepData {
  antwoord?: JaNee;
  toelichting?: string;
  beantwoordOp?: string;
}

export type IdCheckStatus = "te_starten" | "in_behandeling" | "voltooid";
export interface IdCheckData {
  status: IdCheckStatus;
  methode?: "idin" | "nfc_app";
  provider?: string;
  gestartOp?: string;
  voltooidOp?: string;
  resultaat?: {
    naam: string;
    geboortedatum: string;
    documentType?: string;
    documentNummerMasked?: string;
    geldigTot?: string;
    bank?: string;
  };
  match?: { naam: boolean; geboortedatum: boolean; opmerking?: string };
}

export type VolmachtStatus = "te_plannen" | "gepland" | "ondertekend" | "verwerkt";
export interface VolmachtData {
  status: VolmachtStatus;
  afspraakId?: string;
  ondertekendOp?: string;
  ondertekeningMethode?: "video" | "kantoor" | "digitaal";
  documentId?: string;
  /** Alleen verkoper: legalisatie van handtekening. */
  legalisatie?: "niet_vereist" | "vereist" | "afgerond";
  verzondenOp?: string;
  ontvangenOp?: string;
}

export interface IbanData {
  iban?: string;
  tenaamstelling?: string;
  bevestigd?: boolean;
  bevestigdOp?: string;
  /** Verkoper: verdeling bij meerdere verkopers. */
  verdeling?: string;
  derde?: boolean;
}

export interface PartyData {
  person: PersonData;
  eigendom?: EigendomData;
  starters?: StartersData;
  pep?: PepData;
  idcheck?: IdCheckData;
  volmacht?: VolmachtData;
  iban?: IbanData;
  gegevensBevestigd?: boolean;
  gegevensBevestigdOp?: string;
  meta?: Record<string, FieldMeta>;
}

export interface KadastraleAanduiding {
  gemeente?: string;
  sectie?: string;
  perceel?: string;
  appartementsindex?: string;
  grootte?: string; // "2 a 45 ca"
  grootteM2?: number;
}

export interface PropertyData {
  straat?: string;
  huisnummer?: string;
  toevoeging?: string;
  postcode?: string;
  plaats?: string;
  soort?: "woning" | "appartement" | "bouwgrond" | "overig";
  omschrijving?: string;
  kadastraal?: KadastraleAanduiding;
  bouwjaar?: number;
  oppervlakte?: number;
  bagId?: string;
  wozWaarde?: number;
  vve?: { naam?: string; bijdrage?: number };
}

export interface TransactionData {
  koopprijs?: number;
  roerendeZaken?: number;
  datumOndertekening?: string;
  leveringsdatumOrigineel?: string;
  leveringsdatum?: string;
  leveringsdatumStatus?: "voorlopig" | "bevestigd" | "gewijzigd" | "nog_te_bepalen";
  leveringsdatumHistorie?: { datum: string; gewijzigdOp: string; door: string }[];
  waarborgsom?: { bedrag?: number; type?: "waarborgsom" | "bankgarantie"; uiterlijk?: string; ontvangen?: boolean };
  financieringsvoorbehoud?: { bedrag?: number; datum?: string; nhg?: boolean };
  overigeVoorbehouden?: { omschrijving: string; datum?: string }[];
  bijzondereBepalingen?: { titel: string; tekst: string; page?: number }[];
  notarisInKo?: string;
  bedenktijdEinde?: string;
  makelaarKoper?: string;
  makelaarVerkoper?: string;
  ozbJaarbedrag?: number;
  waterschapJaarbedrag?: number;
}

export type BankinstructieStatus = "nog_niet_verwacht" | "verwacht" | "ontvangen" | "in_behandeling";

export interface BankinstructieData {
  geldverstrekker?: string;
  kenmerk?: string;
  hypotheekbedrag?: number;
  inschrijvingsbedrag?: number;
  leningdelen?: { soort: string; bedrag: number }[];
  geldnemers?: string[];
  hypotheekgevers?: string[];
  rang?: string;
  nhg?: boolean;
  algemeneVoorwaarden?: string;
  bijzondereVoorwaarden?: string[];
  bouwdepot?: number;
  afsluitkosten?: number;
  uitbetalingsdatum?: string;
  ontvangenOp?: string;
  documentId?: string;
  controlepunten?: string[];
}

export interface FinancingData {
  hypotheek?: "ja" | "nee" | "onbekend";
  geldverstrekker?: string;
  status?: "aanvraag_loopt" | "offerte_ontvangen" | "offerte_geaccepteerd" | "rond" | "weet_niet";
  overbrugging?: JaNeeWeetNiet;
  meerdereGeldverstrekkers?: JaNee;
  andereGeldverstrekkers?: string;
  eigenMiddelen?: "ja" | "nee" | "weet_niet";
  hypotheekbedragIndicatie?: number;
  adviseur?: { naam?: string; kantoor?: string; email?: string; telefoon?: string };
  bankinstructieStatus?: BankinstructieStatus;
  bankinstructie?: BankinstructieData;
  bevestigd?: boolean;
}

export type WwftBronType = "spaargeld" | "verkoop_woning" | "schenking" | "lening" | "erfenis" | "onderneming" | "beleggingen" | "anders";

export interface WwftBron {
  id: string;
  type: WwftBronType;
  bedrag?: number;
  beschikbaar?: "helemaal" | "gedeeltelijk" | "nog_niet";
  rekening?: "eigen" | "gezamenlijk" | "onderneming" | "iemand_anders" | "anders";
  eigenaarGeld?: "mij" | "mij_en_partner" | "onderneming" | "derde" | "anders";
  overgemaakt?: "ja" | "nee" | "gedeeltelijk";
  details: Record<string, string>;
  documentIds: string[];
}

export interface WwftData {
  bronnen: WwftBron[];
  ingediendOp?: string;
  status?: "niet_van_toepassing" | "uitvraag_open" | "aangeleverd" | "aanvullende_stukken_nodig";
  opmerkingNotaris?: string;
}

export interface KadasterRegistratie {
  type: "hypotheek" | "beslag" | "erfdienstbaarheid" | "kwalitatieve_verplichting" | "voorkeursrecht" | "aantekening" | "overig";
  omschrijving: string;
  partij?: string;
  bedrag?: number;
  deel?: string;
  nummer?: string;
  datum?: string;
  bron?: string;
}

export interface KadasterData {
  status: "op_te_halen" | "opgehaald" | "nader_onderzoek";
  opgehaaldOp?: string;
  bron?: string;
  kenmerk?: string;
  aanduiding?: KadastraleAanduiding;
  rechthebbenden?: { naam: string; recht: string; aandeel?: string; geboortedatum?: string }[];
  registraties?: KadasterRegistratie[];
  vorigeAkte?: { datum?: string; deel?: string; nummer?: string; notaris?: string; bepalingen?: { titel: string; tekst: string }[] };
  documenten?: { kind: string; documentId: string; kenmerk?: string; raadpleegdatum: string }[];
  signaleringen?: string[];
}

export interface DvoData {
  version: string;
  acceptedAt: string;
  acceptedBy: string;
  signatureName: string;
  ip?: string;
  userAgent?: string;
  checks: string[];
  hash?: string;
}

export type AkteStatus = "in_voorbereiding" | "gegenereerd" | "ter_controle_notaris" | "goedgekeurd" | "definitief";

export interface AkteState {
  status: AkteStatus;
  version: number;
  documentId?: string;
  docxDocumentId?: string;
  generatedAt?: string;
  controlepunten: string[];
  bronnen: { label: string; bron: string }[];
  inputHash?: string;
}

export interface DatumCheck {
  gevraagdOp?: string;
  antwoord?: "ja" | "nee_nieuwe_datum" | "onbekend";
  nieuweDatum?: string;
  beantwoordOp?: string;
  herinneringOp?: string;
  signaalNotarisOp?: string;
}

export interface NotaLine {
  label: string;
  bedrag: number; // positief = te betalen door / af van partij; zie `richting`
  richting: "debet" | "credit";
  toelichting?: string;
}

export interface NotaState {
  status: "in_voorbereiding" | "beschikbaar" | "definitief";
  regels: NotaLine[];
  saldo: number; // koper: te voldoen; verkoper: uit te betalen
  berekendOp?: string;
  goedgekeurdOp?: string;
  documentId?: string;
  uitbetaaldOp?: string;
}

export interface KoopovereenkomstProductData {
  status: "concept" | "ter_controle" | "verzonden" | "getekend" | "bedenktijd" | "definitief";
  documentId?: string;
  getekendOp?: string;
}

export interface DossierData {
  service: ServiceKey;
  rolAanvrager?: "koper" | "mede_koper" | "vertegenwoordiger";
  property: PropertyData;
  transaction: TransactionData;
  financing: FinancingData;
  wwft: WwftData;
  kadaster: KadasterData;
  koperIban: IbanData;
  dvo?: DvoData;
  koStatus: "ontbreekt" | "ontvangen" | "verwerking_nodig" | "verwerkt";
  koDocumentId?: string;
  extractie?: { methode: "ai" | "regels" | "handmatig" | "demo"; op: string; ontbrekend: string[]; onzeker: string[] };
  meta: Record<string, FieldMeta>;
  akteLevering?: AkteState;
  akteHypotheek?: AkteState;
  volmachtKoperDocId?: string;
  datumCheck: DatumCheck;
  notaKoper?: NotaState;
  notaVerkoper?: NotaState;
  koopovereenkomst?: KoopovereenkomstProductData;
  aandachtspunten: { id: string; tekst: string; ernst: "info" | "let_op" | "kritiek"; bron: string; opgelost?: boolean }[];
  gepasseerdOp?: string;
  ingeschrevenOp?: string;
  afgewikkeldOp?: string;
  verkoperGestartOp?: string;
  volmachtKoperHash?: string;
  volmachtVerkoperDocId?: string;
  volmachtVerkoperHash?: string;
  koopovereenkomstHash?: string;
}

export type DossierStatus =
  | "concept" // aanvraag nog niet afgerond
  | "wacht_op_ko" // DVO akkoord, nog geen getekende KO
  | "intake" // klanten leveren aan
  | "bij_notaris" // dossier overgedragen
  | "gereed_voor_passeren"
  | "gepasseerd"
  | "afgewikkeld"
  | "geannuleerd";

export const DOCUMENT_KINDS = {
  koopovereenkomst: "Koopovereenkomst",
  dvo: "Dienstverleningsovereenkomst",
  kadaster_eigendom: "Kadastrale eigendomsinformatie",
  kadaster_kaart: "Kadastrale kaart",
  kadaster_hypotheken: "Overzicht inschrijvingen (hypotheken/beslagen)",
  kadaster_akte: "Vorige leveringsakte",
  concept_leveringsakte: "Concept-leveringsakte",
  concept_hypotheekakte: "Concept-hypotheekakte",
  bankinstructie: "Hypotheekinstructie geldverstrekker",
  volmacht_koper: "Volmacht koper (levering + hypotheek)",
  volmacht_verkoper: "Verkoopvolmacht",
  verklaring_starters: "Verklaring startersvrijstelling",
  wwft_bewijs: "Bewijsstuk herkomst middelen",
  aflosnota: "Aflosnota",
  aflosnota_verzoek: "Verzoek aflosnota",
  nota_koper: "Nota van afrekening koper",
  nota_verkoper: "Nota van afrekening verkoper",
  huwelijkse_voorwaarden: "Huwelijkse/partnerschapsvoorwaarden",
  aanvulling: "Aanvullend document",
  dossieroverdracht: "Dossieroverdracht (pakket)",
  concept_koopovereenkomst: "Concept-koopovereenkomst",
  overig: "Overig document",
} as const;
export type DocumentKind = keyof typeof DOCUMENT_KINDS;

export type Visibility = "koper" | "verkoper" | "partijen" | "intern";
