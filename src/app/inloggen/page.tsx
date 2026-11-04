import type { Metadata } from "next";
import Link from "next/link";
import { KeyRound, Mail, MailCheck, Sparkles } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { Notice } from "@/components/ui";
import { requestLogin } from "./actions";
import { isDemo } from "@/lib/config";
import { PERSONAS } from "@/lib/demo/personas";

export const metadata: Metadata = { title: "Inloggen", robots: { index: false } };

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  return (
    <div className="flex min-h-[calc(100vh-2.5rem)] flex-col items-center justify-center bg-paper px-4 py-12">
      <Logo className="mb-8" />
      <div className="card w-full max-w-md p-7">
        <h1 className="flex items-center gap-2 text-2xl font-extrabold text-ink-900"><KeyRound className="h-6 w-6 text-brand-600" />Inloggen</h1>
        <p className="mt-2 text-sm text-ink-600">Geen wachtwoord nodig. Vul je e-mailadres in en je ontvangt een persoonlijke inloglink.</p>
        {sp.fout === "verlopen" && <Notice tone="bad" className="mt-4">Deze inloglink is verlopen of al gebruikt. Vraag een nieuwe aan.</Notice>}
        {sp.fout === "teveel" && <Notice tone="bad" className="mt-4">Te veel pogingen. Probeer het over een kwartier opnieuw.</Notice>}
        {sp.verstuurd ? (
          <div className="mt-6 space-y-4">
            <Notice tone="ok" icon={<MailCheck className="h-5 w-5 text-ok-600" />} title="Check je inbox">Als {sp.email} bij ons bekend is, ontvang je binnen een minuut een inloglink.</Notice>
            {sp.demolink && <Link href={sp.demolink} className="btn btn-dark w-full"><Sparkles className="h-4 w-4" />Demo: open de inloglink direct</Link>}
          </div>
        ) : (
          <form action={requestLogin} className="mt-6 space-y-4">
            <input type="hidden" name="next" value={sp.next ?? ""} />
            <label className="block"><span className="label">E-mailadres</span><input name="email" type="email" required autoComplete="email" className="input" placeholder="jij@voorbeeld.nl" /></label>
            <button className="btn btn-primary w-full"><Mail className="h-4 w-4" />Stuur mij een inloglink</button>
          </form>
        )}
      </div>
      {isDemo() && (
        <div className="mt-6 w-full max-w-md rounded-2xl border border-notaris-100 bg-notaris-50 p-5">
          <p className="flex items-center gap-2 text-sm font-semibold text-ink-900"><Sparkles className="h-4 w-4 text-notaris-600" />Demo: direct inloggen als</p>
          <div className="mt-3 grid grid-cols-2 gap-2">{PERSONAS.map((p) => <Link key={p.key} href={`/demo/als/${p.key}`} className="btn btn-secondary btn-sm justify-start"><span className="truncate">{p.name}</span><span className="text-ink-400">· {p.label}</span></Link>)}</div>
        </div>
      )}
      <p className="mt-6 text-sm text-ink-500">Nog geen dossier? <Link href="/aanvraag" className="font-semibold text-brand-700">Start je aanvraag</Link></p>
    </div>
  );
}
