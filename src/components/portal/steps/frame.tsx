import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft, Cpu, Info } from "lucide-react";
import { StateChip, StateIcon } from "@/components/ui";
import type { Step } from "@/lib/workflow/steps";

export function StepFrame({ step, base, children, aside }: { step: Step; base: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_19rem]">
      <div className="min-w-0">
        <Link href={base} className="btn btn-ghost btn-sm -ml-2 mb-3"><ArrowLeft className="h-4 w-4" />Overzicht</Link>
        <div className="flex items-start gap-4">
          <StateIcon state={step.state} size="lg" />
          <div className="min-w-0">
            <p className="font-mono text-xs font-semibold text-ink-400">Stap {step.nr}</p>
            <h2 className="text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">{step.title}</h2>
            <p className="mt-1.5 text-ink-600">{step.description}</p>
            <div className="mt-3"><StateChip state={step.state} label={step.label} /></div>
          </div>
        </div>
        <div className="mt-8 space-y-6">{children}</div>
      </div>
      <aside className="space-y-4">
        <div className="rounded-2xl border border-platform-100 bg-platform-50/60 p-5 text-sm">
          <p className="flex items-center gap-2 font-semibold text-ink-900"><Cpu className="h-4 w-4 text-platform-600" />Wat wij doen</p>
          <p className="mt-2 text-ink-700">{step.platform}</p>
        </div>
        {aside}
      </aside>
    </div>
  );
}

export function WhyBox({ title = "Waarom vragen we dit?", children }: { title?: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-5 text-sm">
      <p className="flex items-center gap-2 font-semibold text-ink-900"><Info className="h-4 w-4 text-brand-600" />{title}</p>
      <div className="mt-2 space-y-2 leading-relaxed text-ink-600">{children}</div>
    </div>
  );
}

export function Radio({ name, options, value, required }: { name: string; options: [string, string][]; value?: string; required?: boolean }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(([v, l]) => (
        <label key={v} className="cursor-pointer">
          <input type="radio" name={name} value={v} defaultChecked={value === v} required={required} className="peer sr-only" />
          <span className="btn btn-secondary btn-sm peer-checked:border-ink-900 peer-checked:bg-ink-900 peer-checked:text-white peer-focus-visible:shadow-[var(--shadow-focus)]">{l}</span>
        </label>
      ))}
    </div>
  );
}
