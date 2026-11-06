import type { Metadata } from "next";
import Link from "next/link";
import { Mail, Phone, Clock } from "lucide-react";
import { BRAND } from "@/lib/config";
import { LeadForm } from "@/components/site/lead-form";

export const metadata: Metadata = { title: "Contact", description: "Vragen over je akte van levering, hypotheekakte of je dossier? Neem contact op met Akteloket.", alternates: { canonical: "/contact" } };

export default function Page() {
  return (
    <section className="container-page grid gap-12 pt-16 lg:grid-cols-2 lg:pt-20">
      <div>
        <p className="eyebrow">Contact</p>
        <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-ink-900 sm:text-5xl">We helpen je graag</h1>
        <p className="mt-5 text-lg text-ink-600">Heb je al een dossier? Stel je vraag dan het liefst via je <Link href="/inloggen" className="text-brand-700 underline underline-offset-4">portaal</Link>, dan zien we direct waar het over gaat.</p>
        <ul className="mt-8 space-y-4 text-ink-800">
          <li className="flex items-center gap-3"><Mail className="h-5 w-5 text-brass-500" /><a href={`mailto:${BRAND.email}`} className="font-medium hover:text-brand-700">{BRAND.email}</a></li>
          <li className="flex items-center gap-3"><Phone className="h-5 w-5 text-brass-500" /><a href={BRAND.phoneHref} className="font-medium hover:text-brand-700">{BRAND.phone}</a></li>
          <li className="flex items-center gap-3"><Clock className="h-5 w-5 text-brass-500" />Ma t/m vr 08:30 – 18:00, reactie binnen één werkdag</li>
        </ul>
      </div>
      <div className="card p-7"><LeadForm kind="contact" /></div>
    </section>
  );
}
