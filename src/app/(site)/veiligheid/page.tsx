import type { Metadata } from "next";
import { Lock, KeyRound, Eye, FileLock2, ScrollText, ServerCog } from "lucide-react";

export const metadata: Metadata = { title: "Veiligheid en privacy", description: "Hoe Akteloket je gegevens beschermt: versleutelde opslag, toegang per rol, logging, dataminimalisatie en een onafhankelijke notaris.", alternates: { canonical: "/veiligheid" } };

const items = [
  { icon: FileLock2, t: "Versleutelde opslag", d: "Documenten worden versleuteld opgeslagen (AES-256) en alleen ontsleuteld voor wie er toegang toe heeft." },
  { icon: KeyRound, t: "Inloggen zonder wachtwoord", d: "Je logt in met een eenmalige, persoonlijke link per e-mail. Geen wachtwoorden die kunnen uitlekken." },
  { icon: Eye, t: "Toegang per rol", d: "Koper en verkoper zien elkaars persoonlijke en financiële gegevens niet. Wwft-stukken zijn alleen zichtbaar voor de notaris." },
  { icon: ScrollText, t: "Alles gelogd", d: "Akkoordmomenten, wijzigingen, uploads en dossieroverdrachten worden vastgelegd, met tijdstip en wie het deed." },
  { icon: Lock, t: "Dataminimalisatie", d: "We vragen alleen wat nodig is en vragen geen kopie van je paspoort per e-mail. Niet-afgeronde aanvragen worden na 7 dagen verwijderd." },
  { icon: ServerCog, t: "Gehost in de EU", d: "Onze systemen en back-ups draaien bij Europese aanbieders. Met elke dienstverlener sluiten we een verwerkersovereenkomst." },
];

export default function Page() {
  return (
    <section className="container-page pt-16 lg:pt-20">
      <p className="eyebrow">Veiligheid en privacy</p>
      <h1 className="mt-2 max-w-3xl text-4xl font-extrabold leading-tight tracking-tight text-ink-900 sm:text-5xl">Jouw gegevens, zo zorgvuldig als een notaris dat hoort te doen</h1>
      <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((i) => <div key={i.t} className="card p-6"><span className="flex h-11 w-11 items-center justify-center rounded-md bg-brass-50 text-brass-700 ring-1 ring-brass-200"><i.icon className="h-5 w-5" /></span><p className="mt-4 font-serif text-lg font-semibold text-ink-900">{i.t}</p><p className="mt-1.5 text-sm leading-relaxed text-ink-600">{i.d}</p></div>)}
      </div>
    </section>
  );
}
