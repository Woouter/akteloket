import Link from "next/link";
import { ArrowRight, Check, Eye, FileSignature, Sparkles, Timer, Layers, FileText } from "lucide-react";
import type { PartyAccess } from "@/lib/auth/guards";
import { Card, Notice, StateIcon } from "@/components/ui";
import { koApprove, koSign, koSimOthers, koSimBedenktijd, koToAkte } from "@/app/portaal/ko-actions";
import { isDemo, SERVICES } from "@/lib/config";
import { dateNl, dateTimeNl } from "@/lib/util/format";

export function KoProductStep({ a, stepKey }: { a: PartyAccess; stepKey: string }) {
  const d = a.view.data;
  const ko = d.koopovereenkomst ?? { status: "concept" as const };
  const id = a.view.dossier.id;
  const doc = ko.documentId;
  switch (stepKey) {
    case "vragenlijst":
    case "concept":
      return (
        <Card className="flex flex-col gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-3"><FileText className="h-6 w-6 text-brand-600" /><div><p className="font-semibold text-ink-900">Concept-koopovereenkomst</p><p className="text-sm text-ink-600">Opgesteld op basis van jullie antwoorden. {ko.status === "ter_controle" ? "Een jurist controleert het concept." : ""}</p></div></div>
          {doc && <Link href={`/portaal/${id}/document/${doc}`} className="btn btn-secondary btn-sm"><Eye className="h-4 w-4" />Bekijk concept</Link>}
        </Card>
      );
    case "controle":
      return (
        <div className="space-y-4">
          <Notice tone="info" title={ko.status === "ter_controle" ? "Ter juridische controle" : "Gecontroleerd"}>{ko.status === "ter_controle" ? "We controleren of de afspraken volledig en eenduidig zijn vastgelegd. Je hoort het binnen één werkdag." : "Het concept is gecontroleerd en klaar om te tekenen."}</Notice>
          {isDemo() && ko.status === "ter_controle" && <form action={koApprove.bind(null, id)}><button className="btn btn-dark btn-sm"><Sparkles className="h-4 w-4" />Demo: simuleer juridische controle</button></form>}
        </div>
      );
    case "ondertekenen":
      return (
        <div className="space-y-4">
          <Card className="divide-y divide-ink-100 p-0">
            {a.view.parties.map((p) => {
              const signed = p.data.meta?.koGetekend;
              const self = p.id === a.me.id;
              return (
                <div key={p.id} className="flex items-center justify-between gap-3 p-4">
                  <span className="flex items-center gap-2 text-sm"><StateIcon state={signed ? "done" : "todo"} size="sm" /><span className="font-medium text-ink-900">{p.displayName}</span><span className="text-ink-500">({p.side})</span></span>
                  {signed ? <span className="text-xs text-ok-700">Getekend {dateTimeNl(signed.confirmedAt)}</span> : self && ko.status === "verzonden" ? <form action={koSign.bind(null, id, p.id)}><button className="btn btn-primary btn-sm"><FileSignature className="h-4 w-4" />Digitaal tekenen</button></form> : <span className="text-xs text-ink-500">Wacht op handtekening</span>}
                </div>
              );
            })}
          </Card>
          {doc && <Link href={`/portaal/${id}/document/${doc}`} className="btn btn-secondary btn-sm"><Eye className="h-4 w-4" />Lees de overeenkomst</Link>}
          {isDemo() && ko.status === "verzonden" && <form action={koSimOthers.bind(null, id)}><button className="btn btn-dark btn-sm"><Sparkles className="h-4 w-4" />Demo: alle partijen tekenen</button></form>}
        </div>
      );
    case "bedenktijd":
      return (
        <div className="space-y-4">
          <Card className="p-6"><p className="flex items-center gap-2 font-semibold text-ink-900"><Timer className="h-5 w-5 text-brand-600" />Bedenktijd koper</p><p className="mt-2 text-sm text-ink-600">Getekend op {dateNl(ko.getekendOp)}. De koper kan tot en met <strong>{dateNl(d.transaction.bedenktijdEinde)}</strong> zonder opgave van redenen afzien van de koop. Valt het einde op een zaterdag, zondag of feestdag, dan loopt de termijn door tot de eerstvolgende werkdag.</p></Card>
          {isDemo() && ko.status === "bedenktijd" && <form action={koSimBedenktijd.bind(null, id)}><button className="btn btn-dark btn-sm"><Sparkles className="h-4 w-4" />Demo: bedenktijd laten verstrijken</button></form>}
        </div>
      );
    case "akte":
      return (
        <form action={koToAkte.bind(null, id)} className="space-y-4">
          <Notice tone="ok" icon={<Check className="h-4 w-4 text-ok-600" />} title="Alle gegevens staan al klaar">Partijen, woning, koopprijs, leveringsdatum en voorwaarden nemen we over in je notarisdossier. De verkoper krijgt automatisch een uitnodiging.</Notice>
          <div className="grid gap-3 sm:grid-cols-2">
            {(["beide", "levering"] as const).map((s) => (
              <label key={s} className="cursor-pointer"><input type="radio" name="service" value={s} defaultChecked={s === "beide"} className="peer sr-only" /><span className="card flex items-start gap-3 p-4 peer-checked:border-brand-500 peer-checked:shadow-[0_0_0_4px_rgb(31_63_110/0.12)]"><Layers className="h-5 w-5 shrink-0 text-brand-600" /><span><span className="block font-semibold text-ink-900">{SERVICES[s].name}</span><span className="block text-sm text-ink-500">€ {SERVICES[s].price.toLocaleString("nl-NL")} all-in</span></span></span></label>
            ))}
          </div>
          <button className="btn btn-primary" disabled={!["bedenktijd", "definitief", "getekend"].includes(ko.status)}>Start de notariële afhandeling <ArrowRight className="h-4 w-4" /></button>
        </form>
      );
  }
  return null;
}
