import "server-only";
import { listDossiers, loadDossierView, type DossierView } from "./dossier";
import { koperSteps, notaryChecks, progress, verkoperSteps, type NotaryCheck } from "@/lib/workflow/steps";
import { daysBetween, todayIso } from "@/lib/util/format";

export const STATUS_LABEL: Record<string, string> = { concept: "Concept", wacht_op_ko: "Wacht op koopovereenkomst", intake: "Intake klanten", bij_notaris: "Bij notaris", gereed_voor_passeren: "Gereed voor passeren", gepasseerd: "Gepasseerd", afgewikkeld: "Afgewikkeld", geannuleerd: "Geannuleerd" };

export interface Summary {
  view: DossierView;
  checks: NotaryCheck[];
  koperPct: number;
  verkoperPct: number;
  toReview: NotaryCheck[];
  daysToPassing?: number;
  signals: { tekst: string; ernst: string }[];
}

export async function summaries(): Promise<Summary[]> {
  const list = await listDossiers();
  const out: Summary[] = [];
  for (const d of list) {
    const view = await loadDossierView(d.id);
    if (!view) continue;
    const checks = notaryChecks(view);
    out.push({
      view,
      checks,
      koperPct: progress(koperSteps(view)).pct,
      verkoperPct: view.verkopers.length ? progress(verkoperSteps(view)).pct : 100,
      toReview: checks.filter((c) => c.applicable && c.ready && c.status !== "akkoord" && c.key !== "passeren"),
      daysToPassing: view.data.transaction.leveringsdatum ? daysBetween(todayIso(), view.data.transaction.leveringsdatum) : undefined,
      signals: view.data.aandachtspunten.filter((a) => !a.opgelost && a.ernst !== "info"),
    });
  }
  return out.sort((a, b) => (a.daysToPassing ?? 999) - (b.daysToPassing ?? 999));
}
