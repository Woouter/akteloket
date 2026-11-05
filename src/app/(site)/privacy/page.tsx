import type { Metadata } from "next";
import { BRAND, NOTARY_OFFICE, TERMS } from "@/lib/config";

export const metadata: Metadata = { title: "Privacyverklaring", alternates: { canonical: "/privacy" } };

export default function Page() {
  return (
    <section className="container-page max-w-3xl pt-16 lg:pt-20">
      <p className="eyebrow">Juridisch</p>
      <h1 className="mt-3 text-[2rem] leading-tight text-ink-900 sm:text-5xl">Privacyverklaring</h1>
      <p className="mt-4 text-sm text-ink-500">Versie november 2026</p>
      <div className="prose-site mt-8">
        <h2>Wie is verantwoordelijk?</h2>
        <p>Voor de notariële dossiergegevens is {NOTARY_OFFICE.officeName} verwerkingsverantwoordelijke. {BRAND.name} verwerkt deze gegevens als verwerker in opdracht van de notaris. Voor gegevens die je op de website achterlaat zonder dossier (bijvoorbeeld een contactformulier) is {BRAND.name} zelf verantwoordelijk.</p>
        <h2>Welke gegevens en waarom?</h2>
        <ul>
          <li>Contact- en persoonsgegevens: om je dossier aan te maken en de akten op te stellen.</li>
          <li>Gegevens uit de koopovereenkomst en kadastrale registratie: om de overdracht voor te bereiden.</li>
          <li>Identificatie- en Wwft-gegevens: omdat de notaris wettelijk verplicht is cliëntenonderzoek te doen. Deze gegevens zijn alleen zichtbaar voor de notaris.</li>
          <li>Financiële gegevens (IBAN, financiering): voor de nota van afrekening en de uitbetaling.</li>
        </ul>
        <h2>Bewaartermijnen</h2>
        <p>Niet-afgeronde aanvragen verwijderen we na {TERMS.conceptBewaarDagen} dagen. De notaris bewaart akten en dossiers volgens de wettelijke bewaarplichten. Overige dossiergegevens bewaren we niet langer dan nodig.</p>
        <h2>Cookies</h2>
        <p>We gebruiken alleen functionele cookies (om je ingelogd te houden). Geen tracking- of advertentiecookies, en geen externe lettertypen of scripts die je gedrag volgen.</p>
        <h2>Je rechten</h2>
        <p>Je hebt recht op inzage, correctie en — waar de wet het toelaat — verwijdering van je gegevens. Mail daarvoor naar {BRAND.email}. Je kunt ook een klacht indienen bij de Autoriteit Persoonsgegevens.</p>
      </div>
    </section>
  );
}
