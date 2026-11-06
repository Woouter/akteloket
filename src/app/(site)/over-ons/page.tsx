import type { Metadata } from "next";
import Link from "next/link";
import { BRAND, NOTARY_OFFICE } from "@/lib/config";
import { CtaBand } from "@/components/site/sections";
import { Band } from "@/components/site/band";

export const metadata: Metadata = { title: "Over ons", description: "Akteloket maakt de notariële afhandeling van je woningaankoop eenvoudiger, samen met een onafhankelijke notaris.", alternates: { canonical: "/over-ons" } };

export default function Page() {
  return (
    <>
      <section className="bg-white">
        <div className="container-page max-w-3xl py-16 lg:py-20">
          <p className="eyebrow">Over ons</p>
          <h1 className="mt-3 text-4xl leading-tight text-ink-900 sm:text-5xl">Notarieel werk verdient een moderne ervaring</h1>
        </div>
      </section>
      <Band tone="paper" inner="max-w-3xl">
        <div className="prose-site">
          <p>Een huis kopen is spannend genoeg. Toch voelt het notariële deel voor veel mensen als een zwarte doos: formulieren, kopieën mailen, afspraken op kantoor en weinig zicht op waar je dossier staat. Dat kan beter.</p>
          <p>{BRAND.name} is een online platform dat de notariële afhandeling van je woningaankoop voorbereidt en begeleidt. Wij lezen je koopovereenkomst uit, halen kadastrale stukken op, stellen concept-documenten op, bewaken termijnen en houden je bij elke stap op de hoogte.</p>
          <h2>Wij bereiden voor, de notaris beslist</h2>
          <p>De notariële werkzaamheden worden uitgevoerd door {NOTARY_OFFICE.officeName} ({NOTARY_OFFICE.notaryShort}, notaris te {NOTARY_OFFICE.city}). De notaris is onafhankelijk en blijft verantwoordelijk voor alles wat juridisch telt: de identificatie en het cliëntenonderzoek, de controle en vaststelling van de akten, het passeren, de inschrijving in het Kadaster en de geldstromen via de kwaliteitsrekening.</p>
          <h2>Waar we voor staan</h2>
          <ul>
            <li><strong>Snelheid:</strong> je koopovereenkomst is je intake, en je rondt de meeste stappen af wanneer het jou uitkomt.</li>
            <li><strong>Duidelijkheid:</strong> we leggen alles uit in gewone taal en tonen altijd wat de volgende stap is.</li>
            <li><strong>Zorgvuldigheid:</strong> automatisering helpt, maar de notaris controleert. We nemen nooit iets aan.</li>
            <li><strong>Privacy:</strong> we vragen alleen wat nodig is en slaan alles versleuteld op. Lees meer over <Link href="/veiligheid">veiligheid</Link>.</li>
          </ul>
        </div>
      </Band>
      <CtaBand />
    </>
  );
}
