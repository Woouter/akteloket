import Link from "next/link";
import { ArrowLeft, SearchX } from "lucide-react";

/** Onbekend dossier of geen toegang. */
export default function NotFound() {
  return (
    <main className="container-page max-w-lg py-16 text-center">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-ink-100 text-ink-500"><SearchX className="h-6 w-6" /></span>
      <h1 className="mt-4 text-2xl text-ink-900">Dit dossier kunnen we niet vinden</h1>
      <p className="mt-2 text-ink-600">De link klopt niet, of dit dossier hoort niet bij het account waarmee je bent ingelogd.</p>
      <Link href="/portaal" className="btn btn-primary mt-6"><ArrowLeft className="h-4 w-4" />Naar mijn dossiers</Link>
    </main>
  );
}
