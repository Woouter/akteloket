import type { Metadata } from "next";
import Link from "next/link";
import { BRAND } from "@/lib/config";

export const metadata: Metadata = { title: "Algemene voorwaarden", alternates: { canonical: "/voorwaarden" } };

export default function Page() {
  return (
    <section className="container-page max-w-3xl pt-16 lg:pt-20">
      <p className="eyebrow">Juridisch</p>
      <h1 className="mt-3 text-[2rem] leading-tight text-ink-900 sm:text-5xl">Algemene voorwaarden</h1>
      <p className="mt-4 text-sm text-ink-500">Versie november 2026</p>
      <div className="prose-site mt-8">
        <p>Op de notariële dienstverlening zijn de <Link href="/dienstverleningsovereenkomst">dienstverleningsovereenkomst</Link> en de algemene voorwaarden van de aangesloten notaris van toepassing. Op het gebruik van het platform {BRAND.name} zijn daarnaast deze gebruiksvoorwaarden van toepassing.</p>
        <h2>Gebruik van het platform</h2>
        <ul><li>Je gebruikt het portaal alleen voor je eigen dossier en deelt je persoonlijke inloglink niet.</li><li>Automatisch uitgelezen gegevens zijn een hulpmiddel; jij controleert ze en het originele document blijft leidend.</li><li>{BRAND.name} geeft geen juridisch of fiscaal advies. De notaris beoordeelt je situatie.</li></ul>
        <h2>Beschikbaarheid</h2>
        <p>We doen ons best het platform altijd beschikbaar te houden, maar kunnen geen ononderbroken beschikbaarheid garanderen. Termijnen die van belang zijn voor je overdracht bewaken we ook buiten het platform om.</p>
      </div>
    </section>
  );
}
