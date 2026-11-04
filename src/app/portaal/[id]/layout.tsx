import { requireParty } from "@/lib/auth/guards";
import { DossierHeader } from "@/components/portal/shell";
import { koopovereenkomstSteps, koperSteps, progress, verkoperSteps } from "@/lib/workflow/steps";
import { DemoActions } from "@/components/demo/actions";
import { isDemo } from "@/lib/config";

export default async function DossierLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  const a = await requireParty(id);
  const steps = a.view.data.service === "koopovereenkomst" ? koopovereenkomstSteps(a.view) : a.side === "koper" ? koperSteps(a.view) : verkoperSteps(a.view);
  return (
    <>
      <DossierHeader view={a.view} side={a.side} pct={progress(steps).pct} />
      <div className="container-page py-8">{children}</div>
      {isDemo() && <DemoActions dossierId={id} context={a.side} />}
    </>
  );
}
