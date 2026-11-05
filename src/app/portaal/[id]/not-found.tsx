import Link from "next/link";
import { ArrowLeft, SearchX } from "lucide-react";

/** Onbekende stap, document of pagina binnen een dossier. */
export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg py-10 text-center">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-ink-100 text-ink-500"><SearchX className="h-6 w-6" /></span>
      <h2 className="mt-4 text-2xl text-ink-900">Deze pagina bestaat niet (meer)</h2>
      <p className="mt-2 text-ink-600">De link klopt niet of de stap is niet van toepassing op jouw dossier. Je vindt al je stappen en documenten in het overzicht.</p>
      <Link href="/portaal" className="btn btn-primary mt-6"><ArrowLeft className="h-4 w-4" />Naar mijn dossier</Link>
    </div>
  );
}
