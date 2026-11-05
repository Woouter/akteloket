import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireParty } from "@/lib/auth/guards";
import { koopovereenkomstSteps, koperSteps, verkoperSteps } from "@/lib/workflow/steps";
import { KoProductStep } from "@/components/portal/steps/ko-product";
import { StepFrame } from "@/components/portal/steps/frame";
import { GegevensStep, IbanStep, IdStep, VolmachtStep } from "@/components/portal/steps/shared";
import { AanmeldenStep, DossierStep, HypotheekStep, KoStep, LaatsteCheckStep, StartersStep, WoningStep, WwftStep } from "@/components/portal/steps/koper";
import { NotaVerkoperStep, UitnodigingStep, ZekerhedenStep } from "@/components/portal/steps/verkoper";
import { Notice } from "@/components/ui";
import { CheckCircle2, Lock } from "lucide-react";

const STAP_TITEL: Record<string, string> = { aanmelden: "Aanmelden", koopovereenkomst: "Koopovereenkomst", gegevens: "Gegevens controleren", woning: "Woning & financiering", starters: "Startersvrijstelling", iban: "Uitbetalingsrekening", wwft: "Wwft-uitvraag", identificatie: "Identificeren", volmacht: "Volmacht", dossier: "Dossiervoorbereiding", hypotheek: "Hypotheekakte", laatste_check: "Laatste check", uitnodiging: "Uitnodiging", zekerheden: "Zekerheden en aflosnota's", nota: "Nota van afrekening", vragenlijst: "Vragenlijst", concept: "Concept-koopovereenkomst", controle: "Juridische controle", ondertekenen: "Ondertekenen", bedenktijd: "Bedenktijd", akte: "Door naar de akte" };
export async function generateMetadata({ params }: { params: Promise<{ key: string }> }): Promise<Metadata> {
  const { key } = await params;
  return { title: STAP_TITEL[key] ?? "Stap", robots: { index: false } };
}

const SAVED: Record<string, string> = { pep: "Je antwoord op de PEP-vraag is opgeslagen.", bron: "De geldbron is opgeslagen. Upload hieronder de gevraagde bewijsstukken.", starters: "Je antwoorden zijn opgeslagen.", verklaring: "Je verklaring is digitaal ondertekend.", afspraak: "Je afspraak staat gepland. Je ontvangt een bevestiging per e-mail.", "1": "Opgeslagen." };

export default async function Page({ params, searchParams }: { params: Promise<{ id: string; key: string }>; searchParams: Promise<{ fout?: string; opgeslagen?: string; iban?: string; tenaam?: string }> }) {
  const { id, key } = await params;
  const { fout, opgeslagen, iban, tenaam } = await searchParams;
  const a = await requireParty(id, `/portaal/${id}/stap/${key}`);
  const isKo = a.view.data.service === "koopovereenkomst";
  const steps = isKo ? koopovereenkomstSteps(a.view) : a.side === "koper" ? koperSteps(a.view) : verkoperSteps(a.view);
  const step = steps.find((s) => s.key === key);
  if (!step) notFound();
  const base = `/portaal/${id}`;
  if (step.state === "locked") return <StepFrame step={step} base={base}><Notice tone="info" icon={<Lock className="h-4 w-4 text-brand-600" />} title="Deze stap komt later">{step.label}.</Notice></StepFrame>;
  let body: React.ReactNode = null;
  if (isKo) body = <KoProductStep a={a} stepKey={key} />;
  else if (a.side === "koper") {
    switch (key) {
      case "aanmelden": body = <AanmeldenStep a={a} />; break;
      case "koopovereenkomst": body = <KoStep a={a} />; break;
      case "gegevens": body = <GegevensStep a={a} />; break;
      case "woning": body = <WoningStep a={a} />; break;
      case "starters": body = <StartersStep a={a} />; break;
      case "iban": body = <IbanStep a={a} error={fout} draft={fout ? { iban, tenaam } : undefined} />; break;
      case "wwft": body = <WwftStep a={a} />; break;
      case "identificatie": body = <IdStep a={a} />; break;
      case "volmacht": body = <VolmachtStep a={a} error={fout} />; break;
      case "dossier": body = <DossierStep a={a} />; break;
      case "hypotheek": body = <HypotheekStep a={a} />; break;
      case "laatste_check": body = <LaatsteCheckStep a={a} />; break;
    }
  } else {
    switch (key) {
      case "uitnodiging": body = <UitnodigingStep a={a} />; break;
      case "gegevens": body = <GegevensStep a={a} />; break;
      case "identificatie": body = <IdStep a={a} />; break;
      case "iban": body = <IbanStep a={a} error={fout} draft={fout ? { iban, tenaam } : undefined} />; break;
      case "volmacht": body = <VolmachtStep a={a} error={fout} />; break;
      case "zekerheden": body = <ZekerhedenStep a={a} />; break;
      case "nota": body = <NotaVerkoperStep a={a} />; break;
    }
  }
  return <StepFrame step={step} base={base}>{opgeslagen && <Notice tone="ok" icon={<CheckCircle2 className="h-5 w-5 text-ok-600" />} title="Opgeslagen">{SAVED[opgeslagen] ?? SAVED["1"]}</Notice>}{body}</StepFrame>;
}
