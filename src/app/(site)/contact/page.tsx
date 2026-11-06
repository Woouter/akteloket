import type { Metadata } from "next";
import Link from "next/link";
import { Band } from "@/components/site/band";
import { Glyph } from "@/components/icons/glyphs";
import { BRAND } from "@/lib/config";
import { LeadForm } from "@/components/site/lead-form";

export const metadata: Metadata = { title: "Contact", description: "Vragen over je akte van levering, hypotheekakte of je dossier? Neem contact op met Akteloket.", alternates: { canonical: "/contact" } };

export default function Page() {
  return (
    <Band tone="white" border={false} inner="grid gap-12 lg:grid-cols-2">
      <div>
        <p className="eyebrow">Contact</p>
        <h1 className="mt-3 text-4xl text-ink-900 sm:text-5xl">We helpen je graag</h1>
        <p className="mt-5 text-lg text-ink-600">Heb je al een dossier? Stel je vraag dan het liefst via je <Link href="/inloggen" className="text-ink-900 underline decoration-brass-400 underline-offset-4">portaal</Link>, dan zien we direct waar het over gaat.</p>
        <ul className="mt-8 border-t border-ink-200 text-ink-800">
          <li className="flex items-center gap-4 border-b border-ink-200 py-4"><Glyph name="mail" size={30} /><a href={`mailto:${BRAND.email}`} className="font-medium hover:underline hover:decoration-brass-400 hover:underline-offset-4">{BRAND.email}</a></li>
          <li className="flex items-center gap-4 border-b border-ink-200 py-4"><Glyph name="phone" size={30} /><a href={BRAND.phoneHref} className="font-medium hover:underline hover:decoration-brass-400 hover:underline-offset-4">{BRAND.phone}</a></li>
          <li className="flex items-center gap-4 border-b border-ink-200 py-4"><Glyph name="clock" size={30} />Maandag tot en met vrijdag van 08:30 tot 18:00 uur. We reageren binnen één werkdag.</li>
        </ul>
      </div>
      <div className="border-t-[3px] border-brass-500 bg-paper p-7"><LeadForm kind="contact" /></div>
    </Band>
  );
}
