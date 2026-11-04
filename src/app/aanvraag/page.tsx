import type { Metadata } from "next";
import { AanvraagFlow } from "@/components/aanvraag/flow";
import { isDemo } from "@/lib/config";
import { dvoSections, DVO_CHECKS } from "@/lib/docgen/dvo";

export const metadata: Metadata = { title: "Start je aanvraag", robots: { index: false } };

export default async function Page({ searchParams }: { searchParams: Promise<{ dienst?: string }> }) {
  const sp = await searchParams;
  const initial = sp.dienst === "levering" || sp.dienst === "hypotheek" || sp.dienst === "beide" ? sp.dienst : undefined;
  return <AanvraagFlow initialService={initial} demo={isDemo()} dvo={{ beide: dvoSections("beide"), levering: dvoSections("levering"), hypotheek: dvoSections("hypotheek") }} checks={DVO_CHECKS} />;
}
