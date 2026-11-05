import { getUser } from "@/lib/auth/session";
import { requireParty } from "@/lib/auth/guards";
import { DossierHeader } from "@/components/portal/shell";
import { koopovereenkomstSteps, koperSteps, progress, verkoperSteps } from "@/lib/workflow/steps";
import { DemoActions } from "@/components/demo/actions";
import { isDemo } from "@/lib/config";

export default async function DossierLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Zonder sessie stuurt de pagina zelf door naar inloggen (met het juiste `next`-pad).
  if (!(await getUser())) return <>{children}</>;
  const a = await requireParty(id);
  const steps = a.view.data.service === "koopovereenkomst" ? koopovereenkomstSteps(a.view) : a.side === "koper" ? koperSteps(a.view) : verkoperSteps(a.view);
  const demo = isDemo();
  return (
    <>
      <DossierHeader view={a.view} side={a.side} pct={progress(steps, a.me.id).pct} />
      <div className={demo ? "container-page pb-24 pt-8" : "container-page py-8"}>{children}</div>
      {demo && <DemoActions dossierId={id} context={a.side} />}
    </>
  );
}
