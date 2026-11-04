import { notFound } from "next/navigation";
import { requireParty } from "@/lib/auth/guards";
import { koperSteps, verkoperSteps } from "@/lib/workflow/steps";
import { StepFrame } from "@/components/portal/steps/frame";
import { GegevensStep, IbanStep, IdStep, VolmachtStep } from "@/components/portal/steps/shared";
import { AanmeldenStep, DossierStep, HypotheekStep, KoStep, LaatsteCheckStep, StartersStep, WoningStep, WwftStep } from "@/components/portal/steps/koper";
import { NotaVerkoperStep, UitnodigingStep, ZekerhedenStep } from "@/components/portal/steps/verkoper";
import { Notice } from "@/components/ui";
import { Lock } from "lucide-react";

export default async function Page({ params, searchParams }: { params: Promise<{ id: string; key: string }>; searchParams: Promise<{ fout?: string }> }) {
  const { id, key } = await params;
  const { fout } = await searchParams;
  const a = await requireParty(id);
  const steps = a.side === "koper" ? koperSteps(a.view) : verkoperSteps(a.view);
  const step = steps.find((s) => s.key === key);
  if (!step) notFound();
  const base = `/portaal/${id}`;
  if (step.state === "locked") return <StepFrame step={step} base={base}><Notice tone="info" icon={<Lock className="h-4 w-4 text-brand-600" />} title="Deze stap komt later">{step.label}.</Notice></StepFrame>;
  let body: React.ReactNode = null;
  if (a.side === "koper") {
    switch (key) {
      case "aanmelden": body = <AanmeldenStep a={a} />; break;
      case "koopovereenkomst": body = <KoStep a={a} />; break;
      case "gegevens": body = <GegevensStep a={a} />; break;
      case "woning": body = <WoningStep a={a} />; break;
      case "starters": body = <StartersStep a={a} />; break;
      case "iban": body = <IbanStep a={a} error={fout} />; break;
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
      case "iban": body = <IbanStep a={a} error={fout} />; break;
      case "volmacht": body = <VolmachtStep a={a} error={fout} />; break;
      case "zekerheden": body = <ZekerhedenStep a={a} />; break;
      case "nota": body = <NotaVerkoperStep a={a} />; break;
    }
  }
  return <StepFrame step={step} base={base}>{body}</StepFrame>;
}
