import type { Metadata } from "next";
import { KoForm } from "@/components/aanvraag/ko-form";

export const metadata: Metadata = { title: "Koopovereenkomst opstellen", robots: { index: false } };

export default function Page() {
  return (
    <>
      <h1 className="text-3xl font-semibold text-ink-900 sm:text-4xl">Koopovereenkomst opstellen</h1>
      <p className="mb-8 mt-3 text-lg text-ink-600">Beantwoord de vragen hieronder. Wij maken er een complete koopovereenkomst van, die juridisch wordt gecontroleerd voordat jullie tekenen.</p>
      <KoForm />
    </>
  );
}
