import type { Metadata } from "next";
import { dvoSections } from "@/lib/docgen/dvo";
import { DVO_VERSION } from "@/lib/config";

export const metadata: Metadata = { title: "Dienstverleningsovereenkomst", description: "De dienstverleningsovereenkomst die je digitaal accepteert bij je aanvraag.", alternates: { canonical: "/dienstverleningsovereenkomst" } };

export default function Page() {
  return (
    <section className="container-page max-w-3xl pt-16 lg:pt-20">
      <p className="eyebrow">Juridisch</p>
      <h1 className="mt-3 text-[2rem] leading-tight text-ink-900 sm:text-5xl">{"Dienstverlenings\u00ADovereenkomst"}</h1>
      <p className="mt-4 text-sm text-ink-500">Versie {DVO_VERSION} · voorbeeld voor de dienst levering + hypotheekakte. Bij je aanvraag zie je de versie voor jouw dienst.</p>
      <div className="prose-site mt-8">
        {dvoSections("beide").map((s) => (
          <div key={s.title}><h2>{s.title}</h2><ul>{s.items.map((i) => <li key={i}>{i}</li>)}</ul></div>
        ))}
      </div>
    </section>
  );
}
