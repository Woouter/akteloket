import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Fingerprint, Landmark, ShieldCheck, Smartphone } from "lucide-react";
import { requireParty } from "@/lib/auth/guards";
import { completeIdCheck } from "@/app/portaal/actions";
import { isDemo } from "@/lib/config";
import { Notice } from "@/components/ui";

export const metadata: Metadata = { title: "Identificeren", robots: { index: false } };

/**
 * Identificatie. In productie wordt hier doorverwezen naar de door de notaris gekozen
 * provider (bijv. iDIN via een aangesloten iDIN-acquirer, of een NFC-ID-app). In de demo
 * simuleren we de providerstap.
 */
export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ party?: string; m?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const a = await requireParty(id, `/portaal/${id}/stap/identificatie`);
  const p = a.mine.find((x) => x.id === sp.party);
  // Zonder (geldige) persoon: terug naar de stap, waar je de methode kiest.
  if (!p || p.data.idcheck?.status === "voltooid") redirect(`/portaal/${id}/stap/identificatie`);
  const m = sp.m === "nfc_app" ? "nfc_app" : "idin";
  return (
    <div className="mx-auto max-w-lg">
      <Link href={`/portaal/${id}/stap/identificatie`} className="btn btn-ghost btn-sm -ml-2 mb-3"><ArrowLeft className="h-4 w-4" />Terug naar identificeren</Link>
      <div className="card overflow-hidden p-0">
        <div className="flex items-center gap-3 bg-ink-900 px-6 py-4 text-white">{m === "idin" ? <Landmark className="h-5 w-5" /> : <Smartphone className="h-5 w-5" />}<span className="font-semibold">{m === "idin" ? "Identificeren met iDIN" : "Identificeren met je identiteitsbewijs"}</span></div>
        <div className="space-y-5 p-6">
          {isDemo() && <Notice tone="demo" title="Demo — gesimuleerde provider">In productie word je hier doorgestuurd naar {m === "idin" ? "je eigen bank (iDIN)" : "de ID-app die de chip van je paspoort uitleest en een selfie vergelijkt"}. In de demo rond je de stap direct af.</Notice>}
          <div className="flex items-start gap-3 text-sm text-ink-700"><Fingerprint className="h-5 w-5 shrink-0 text-brand-600" /><p>Je identificeert je als <strong>{p.displayName}</strong>. De gecontroleerde naam en geboortedatum vergelijken we automatisch met de koopovereenkomst.</p></div>
          <form action={completeIdCheck.bind(null, id, p.id, m)}><button className="btn btn-primary w-full"><ShieldCheck className="h-4 w-4" />{isDemo() ? "Simuleer geslaagde identificatie" : "Doorgaan naar provider"}</button></form>
        </div>
      </div>
    </div>
  );
}
