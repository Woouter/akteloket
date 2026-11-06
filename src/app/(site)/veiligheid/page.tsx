import type { Metadata } from "next";
import { Band } from "@/components/site/band";
import { Glyph, type GlyphName } from "@/components/icons/glyphs";

export const metadata: Metadata = { title: "Veiligheid en privacy", description: "Hoe Akteloket je gegevens beschermt: versleutelde opslag, toegang per rol, logging, dataminimalisatie en een onafhankelijke notaris.", alternates: { canonical: "/veiligheid" } };

const items = [
  { glyph: "archive" as GlyphName, t: "Versleutelde opslag", d: "Documenten worden versleuteld opgeslagen (AES-256) en alleen ontsleuteld voor wie er toegang toe heeft." },
  { glyph: "key" as GlyphName, t: "Inloggen zonder wachtwoord", d: "Je logt in met een eenmalige, persoonlijke link per e-mail. Geen wachtwoorden die kunnen uitlekken." },
  { glyph: "idcard" as GlyphName, t: "Toegang per rol", d: "Koper en verkoper zien elkaars persoonlijke en financiële gegevens niet. Wwft-stukken zijn alleen zichtbaar voor de notaris." },
  { glyph: "clipboard" as GlyphName, t: "Alles gelogd", d: "Akkoordmomenten, wijzigingen, uploads en dossieroverdrachten worden vastgelegd, met tijdstip en wie het deed." },
  { glyph: "lock" as GlyphName, t: "Dataminimalisatie", d: "We vragen alleen wat nodig is en vragen geen kopie van je paspoort per e-mail. Niet-afgeronde aanvragen worden na 7 dagen verwijderd." },
  { glyph: "pin" as GlyphName, t: "Gehost in de EU", d: "Onze systemen en back-ups draaien bij Europese aanbieders. Met elke dienstverlener sluiten we een verwerkersovereenkomst." },
];

export default function Page() {
  return (
    <>
      <section className="bg-white">
        <div className="container-page py-16 lg:py-20">
          <p className="eyebrow">Veiligheid en privacy</p>
          <h1 className="mt-3 max-w-3xl text-4xl leading-tight text-ink-900 sm:text-5xl">Jouw gegevens, zo zorgvuldig als een notaris dat hoort te doen</h1>
        </div>
      </section>
      <Band tone="paper">
        <div className="grid gap-x-14 border-t border-ink-200 md:grid-cols-2 lg:grid-cols-3">
          {items.map((i) => (
            <div key={i.t} className="flex gap-5 border-b border-ink-200 py-8">
              <Glyph name={i.glyph} size={42} />
              <div><p className="font-serif text-lg font-semibold text-ink-900">{i.t}</p><p className="mt-1.5 text-sm leading-relaxed text-ink-600">{i.d}</p></div>
            </div>
          ))}
        </div>
      </Band>
    </>
  );
}
