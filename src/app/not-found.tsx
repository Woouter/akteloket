import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, Home } from "lucide-react";
import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { BRAND } from "@/lib/config";

export const metadata: Metadata = { title: "Pagina niet gevonden", robots: { index: false } };

/** Nederlandse 404 in de huisstijl (geldt voor elke onbekende URL en voor notFound()). */
export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="container-page max-w-3xl py-20 lg:py-28">
        <p className="eyebrow">Foutcode 404</p>
        <h1 className="mt-3 text-4xl text-ink-900 sm:text-5xl">Deze pagina bestaat niet (meer)</h1>
        <p className="mt-5 text-lg leading-relaxed text-ink-600">
          Misschien is de link verouderd of zit er een typfout in het adres. Via de homepage of de kennisbank vind je snel wat je zoekt. Kom je er niet uit? Bel {BRAND.phone} of mail {BRAND.email}.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link href="/" className="btn btn-primary btn-lg"><Home className="h-4 w-4" />Naar de homepage</Link>
          <Link href="/kennisbank" className="btn btn-secondary btn-lg"><BookOpen className="h-4 w-4" />Kennisbank</Link>
          <Link href="/aanvraag" className="btn btn-ghost btn-lg">Start je aanvraag <ArrowRight className="h-4 w-4" /></Link>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
