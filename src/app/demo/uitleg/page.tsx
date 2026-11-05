import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Bot, Cpu, Database, FileText, Fingerprint, Globe, KeyRound, Landmark, Lock, Mail, Map, PenLine, Scale, ServerCog, ShieldCheck, Store, User, Workflow } from "lucide-react";
import { Card } from "@/components/ui";

export const metadata: Metadata = { title: "Hoe alles werkt", robots: { index: false } };

const lanes = [
  { icon: User, title: "Koper (uitgebreide klantreis)", color: "border-koper-100 bg-koper-50/50", steps: ["1 Aanmelden & DVO-akkoord", "2 Koopovereenkomst uploaden", "3 Gegevens controleren", "4 Woning & financiering", "5 Startersvrijstelling (OB)", "6 Uitbetalingsrekening (IBAN)", "7 Wwft-uitvraag incl. PEP", "8 Identificeren (ID-check)", "9 Volmacht (levering + hypotheek)", "10 Dossiervoorbereiding", "11 Bankinstructie & concept-hypotheekakte", "12 Laatste check & bevestigen"] },
  { icon: Store, title: "Verkoper (eenvoudige klantreis)", color: "border-verkoper-100 bg-verkoper-50/50", steps: ["A Uitnodiging portaal", "B Gegevens controleren (incl. mede-eigenaren)", "C Identificeren", "D IBAN uitbetaling (+ verdeling)", "E Eenvoudige verkoopvolmacht (evt. legalisatie)", "F Bestaande zekerheden en aflosnota's", "G Nota van afrekening en uitbetaling"] },
  { icon: Scale, title: "Notaris (controlerend)", color: "border-notaris-100 bg-notaris-50/50", steps: ["N1 Wwft-uitvraag (incl. PEP) en identificatie", "N2 Volmachten koper en verkoper", "N3 Concept-leveringsakte", "N4 Concept-hypotheekakte (en bankinstructie)", "N5 Aflosnota's en doorhaling", "N6 Nota's van afrekening", "N7 Passeren en definitieve afwikkeling"] },
];

const automation = [
  ["Koopovereenkomst-scanner", "Leest uit: partijen (naam, geboortedatum/-plaats, adres, burgerlijke staat), object + kadastrale aanduiding, koopprijs en roerende zaken, datum ondertekening, leveringsdatum, waarborgsom, financieringsvoorbehoud en andere ontbindende voorwaarden, bedenktijd, gekozen notaris, makelaar en bijzondere bepalingen. Per gegeven: pagina, letterlijk citaat en zekerheid. Met AI (Claude, leest ook scans) of zonder (regelgebaseerd op de tekstlaag)."],
  ["Kadasterkoppeling", "Na eenduidige identificatie van het object: eigendomsinformatie, kadastrale kaart, vorige leveringsakte. Registraties worden gestructureerd (hypotheken → aflosnota's, erfdienstbaarheden, kwalitatieve verplichtingen, beslagen). Rechthebbenden worden vergeleken met de verkopers uit de koopovereenkomst."],
  ["Startersvrijstelling", "Toets per koper op leeftijd op de leveringsdatum en de woningwaardegrens van dát kalenderjaar (2026: € 555.000; 2027: € 615.000). Bij mogelijke vrijstelling: drie vragen en een verklaring ter ondertekening. Overdrachtsbelasting wordt per aandeel berekend."],
  ["Wwft-tool", "Dynamische vragen per geldbron (spaargeld, verkoop woning, schenking, lening, erfenis, onderneming, beleggingen) met direct de juiste uploads volgens de door de notaris goedgekeurde documentmatrix. Signaleert geld van derden, zakelijke rekeningen en tekorten t.o.v. het benodigde eigen geld."],
  ["Concept-akten", "Leveringsakte uit koopovereenkomst + kadaster + vorige akte; hypotheekakte uit de bankinstructie. Elk overgenomen gegeven heeft een bron; ontbrekende gegevens worden expliciet gemarkeerd; controlepunten (bijv. kettingbeding, bestaande hypotheek, voorbehouden) staan in een bijlage. Download als Word-bestand."],
  ["Volmachten, verklaringen en nota's", "Gecombineerde volmacht koper, eenvoudige verkoopvolmacht, verklaring startersvrijstelling, verzoek aflosnota, nota's van afrekening (incl. OZB-verrekening, aflossingen, doorhalingskosten)."],
  ["Termijnbewaking", "Datumcheck 14 dagen vóór levering (herinnering na 3 dagen, signaal aan notaris na nog 2), verwachting bankinstructie, vriendelijke specifieke herinneringen ('We missen nog …'), opruimen van verlaten aanvragen na 7 dagen."],
  ["Dossieroverdracht", "Zodra de koperskant compleet is en de concept-leveringsakte klaarstaat: overdracht 1 met alle onderdelen uit hoofdstuk 11. Komt de bankinstructie later, dan volgt automatisch een aanvullende overdracht met de concept-hypotheekakte. Alles als ZIP te downloaden."],
];

const integrations = [
  { icon: Map, t: "Kadaster", d: "Adapter met twee implementaties: een demo-koppeling met fictieve data en een HTTP-koppeling voor uw eigen Kadaster-API (KADASTER_API_URL/KEY). Het verwachte JSON-formaat en de mapping staan in docs/INTEGRATIES.md.", s: "Demo: gesimuleerd · Productie: eigen API" },
  { icon: Globe, t: "PDOK Locatieserver (BAG)", d: "Publieke, gratis API: adres-autocomplete en het gekoppelde kadastrale perceel bij een aanvraag zonder koopovereenkomst.", s: "Echt, ook in de demo" },
  { icon: Bot, t: "Claude (AI-extractie)", d: "Leest de koopovereenkomst en bankinstructie als PDF (ook scans en foto's) met gestructureerde uitvoer. Zonder sleutel valt het systeem terug op de regelgebaseerde scanner.", s: "Optioneel (ANTHROPIC_API_KEY)" },
  { icon: Fingerprint, t: "Identificatie", d: "iDIN (via een iDIN-acquirer) of een NFC-ID-app. In de demo gesimuleerd. Er worden geen kopieën van ID-bewijzen opgeslagen zonder vastgesteld beveiligd proces.", s: "Demo: gesimuleerd" },
  { icon: PenLine, t: "Ondertekening", d: "DVO: digitaal akkoord met versie, tijdstip, IP en hash. Volmacht: tijdens een video- of kantoorafspraak (formaliteiten door de notaris). Koppeling met een e-signing-provider is voorbereid.", s: "Demo: gesimuleerd" },
  { icon: Mail, t: "E-mail", d: "Alles via een gelogde outbox. In productie verzonden via Resend (EU-regio) vanaf het eigen domein, met een sleutel die alleen mag verzenden. In de demo zichtbaar in de demo-mailbox.", s: "Demo: mailbox" },
  { icon: ServerCog, t: "Hosting en opslag", d: "De app draait op Vercel, de PostgreSQL-database en de tijdelijke upload-inbox op Supabase, beide in Frankfurt. Productie en demo zijn volledig gescheiden, met elk een eigen database en eigen sleutels. Documenten worden versleuteld opgeslagen (AES-256-GCM).", s: "EU (Frankfurt)" },
];

export default function Page() {
  return (
    <div className="container-page max-w-6xl py-12">
      <p className="eyebrow">Hoe alles werkt</p>
      <h1 className="mt-2 max-w-3xl text-4xl font-extrabold leading-tight tracking-tight text-ink-900 sm:text-5xl">Eén dossier, drie klantreizen, één controlerende notaris</h1>
      <p className="mt-5 max-w-3xl text-lg text-ink-600">Het platform verzamelt, structureert en signaleert. De notaris identificeert, beoordeelt, controleert, stelt akten vast en passeert. Deze pagina beschrijft hoe dat technisch en procesmatig in elkaar zit.</p>

      <section className="mt-12 grid gap-5 lg:grid-cols-3">
        {lanes.map((l) => (
          <div key={l.title} className={`rounded-3xl border p-6 ${l.color}`}>
            <p className="flex items-center gap-2 font-bold text-ink-900"><l.icon className="h-5 w-5" />{l.title}</p>
            <ol className="mt-4 space-y-1.5 text-sm text-ink-700">{l.steps.map((s) => <li key={s}>{s}</li>)}</ol>
          </div>
        ))}
      </section>

      <section className="mt-14">
        <h2 className="flex items-center gap-2 text-2xl font-bold text-ink-900"><Workflow className="h-6 w-6 text-brand-600" />Het verloop van een dossier</h2>
        <ol className="mt-6 grid gap-3 md:grid-cols-2">
          {[
            ["Aanvraag (2 minuten)", "Dienst kiezen → koopovereenkomst uploaden → gegevens controleren → contact + DVO digitaal accepteren. Zonder getekende koopovereenkomst: status ‘Wachten op getekende koopovereenkomst’."],
            ["Automatische start", "Kadaster wordt geraadpleegd, verkopers worden uitgenodigd, startertoets draait, termijnen (voorbehouden, waarborgsom, leveringsdatum) worden bewaakt."],
            ["Klanten leveren aan", "Koper en verkoper doorlopen parallel hun eigen stappen. Ze zien elkaars gegevens niet. Volmachten worden vroeg ingepland, los van de hypotheekofferte."],
            ["Concept-akten en overdracht", "Concept-leveringsakte, volmachten en nota's worden automatisch klaargezet; de notaris krijgt een gestructureerde dossieroverdracht."],
            ["Notaris controleert (N1–N7)", "Per controlepunt: akkoord of een gerichte aanvullingsvraag aan de klant (zonder dat die het hele formulier opnieuw invult)."],
            ["Bankinstructie", "De geldverstrekker stuurt de instructie aan de notaris; de notaris deelt hem veilig met het platform → concept-hypotheekakte → aanvullende overdracht."],
            ["14 dagen vooraf", "Datumcheck bij de koper; nota's van afrekening worden gedeeld en definitief vastgesteld."],
            ["Passeren en afwikkelen", "Passeren, inschrijving, her-recherche, uitbetaling verkoper (na aflossing en doorhaling) en eventueel tegoed koper."],
          ].map(([t, d], i) => <li key={t} className="flex gap-4 rounded-2xl border border-ink-100 bg-white p-5"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink-900 text-sm font-bold text-white">{i + 1}</span><span><span className="block font-semibold text-ink-900">{t}</span><span className="mt-1 block text-sm text-ink-600">{d}</span></span></li>)}
        </ol>
      </section>

      <section className="mt-14">
        <h2 className="flex items-center gap-2 text-2xl font-bold text-ink-900"><Cpu className="h-6 w-6 text-platform-600" />Wat het platform automatiseert</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2">{automation.map(([t, d]) => <Card key={t} className="p-5"><p className="font-bold text-ink-900">{t}</p><p className="mt-1.5 text-sm leading-relaxed text-ink-600">{d}</p></Card>)}</div>
      </section>

      <section className="mt-14">
        <h2 className="flex items-center gap-2 text-2xl font-bold text-ink-900"><Landmark className="h-6 w-6 text-brand-600" />Koppelingen</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{integrations.map((i) => <Card key={i.t} className="p-5"><i.icon className="h-6 w-6 text-brand-600" /><p className="mt-3 font-bold text-ink-900">{i.t}</p><p className="mt-1 text-sm text-ink-600">{i.d}</p><p className="mt-3 text-xs font-semibold text-ink-500">{i.s}</p></Card>)}</div>
      </section>

      <section className="mt-14 grid gap-5 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="flex items-center gap-2 text-xl font-bold text-ink-900"><ShieldCheck className="h-5 w-5 text-ok-600" />Beveiliging en privacy</h2>
          <ul className="mt-4 space-y-2 text-sm text-ink-700">
            <li className="flex gap-2"><Lock className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" />Alle documenten AES-256-GCM-versleuteld opgeslagen.</li>
            <li className="flex gap-2"><KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" />Inloggen met eenmalige magic links (15 min); sessies als httpOnly-cookie.</li>
            <li className="flex gap-2"><User className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" />Strikte scheiding koper/verkoper; Wwft-bewijs alleen zichtbaar voor de notaris.</li>
            <li className="flex gap-2"><FileText className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" />Auditlog van akkoorden, wijzigingen (met oorspronkelijke waarde), uploads, openingen van documenten en overdrachten.</li>
            <li className="flex gap-2"><Database className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" />Dataminimalisatie: geen BSN, geen ID-kopieën per mail; verlaten aanvragen na 7 dagen verwijderd.</li>
          </ul>
        </Card>
        <Card className="p-6">
          <h2 className="text-xl font-bold text-ink-900">Wat is demo en wat is echt?</h2>
          <ul className="mt-4 space-y-2 text-sm text-ink-700">
            <li><strong>Echt:</strong> de volledige applicatie, database, workflow, scanner (regelgebaseerd; AI met sleutel), PDOK, documentgeneratie (Word), nota-berekeningen, ZIP-overdracht, rollen en rechten.</li>
            <li><strong>Gesimuleerd:</strong> Kadaster-data (tot uw API is gekoppeld), iDIN/ID-app, e-mailverzending, ondertekening tijdens de volmachtafspraak, berichten van banken (via Demo-acties).</li>
            <li><strong>Te valideren door de notaris:</strong> aktemodellen en clausulebibliotheek, Wwft-documentmatrix, volmachttekst en -formaliteiten, DVO-tekst, termijnen. Zie het <Link href="/demo/validatie" className="text-brand-700 underline">beoordelingskader</Link>.</li>
          </ul>
        </Card>
      </section>

      <div className="mt-12 flex flex-wrap gap-3"><Link href="/demo/start/notaris" className="btn btn-primary">Start de tour voor de notaris <ArrowRight className="h-4 w-4" /></Link><Link href="/demo" className="btn btn-secondary">Terug naar de demo-hub</Link></div>
    </div>
  );
}
