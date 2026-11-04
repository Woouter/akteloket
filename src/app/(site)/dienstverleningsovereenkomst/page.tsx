import type { Metadata } from "next";
import { dvoSections } from "@/lib/docgen/dvo";
import { DVO_VERSION } from "@/lib/config";

export const metadata: Metadata = { title: "Dienstverleningsovereenkomst", description: "De dienstverleningsovereenkomst die je digitaal accepteert bij je aanvraag.", alternates: { canonical: "/dienstverleningsovereenkomst" } };

export default function Page() {
  return (
    <section className="container-page max-w-3xl py-16">
      <h1 className="text-4xl font-extrabold tracking-tight text-ink-900">Dienstverleningsovereenkomst</h1>
      <p className="mt-3 text-sm text-ink-500">Versie {DVO_VERSION} · voorbeeld voor de dienst levering + hypotheekakte. Concepttekst ter validatie door de notaris.</p>
      <div className="prose-site mt-8">
        {dvoSections("beide").map((s) => (
          <div key={s.title}><h2>{s.title}</h2><ul>{s.items.map((i) => <li key={i}>{i}</li>)}</ul></div>
        ))}
      </div>
    </section>
  );
}
