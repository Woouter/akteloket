import { AlertTriangle, Check, Home, Landmark, Map, Users, MessageSquareWarning } from "lucide-react";
import type { DossierView } from "@/lib/domain/dossier";
import { Badge, Card, KV, StateIcon } from "@/components/ui";
import { resolvePunt, closeRequest } from "@/app/notaris/actions";
import { cn, dateNl, euro, personName } from "@/lib/util/format";
import { describeRegistratie } from "@/lib/integrations/kadaster";
import { CardTitle } from "./card-title";
import { BANK_STATUS, FIN_STATUS, KADASTER_STATUS, REQUEST_STATUS, SIDE_LABEL, cap, label } from "./labels";

export function DossierSummary({ view, isNotary }: { view: DossierView; isNotary: boolean }) {
  const d = view.data;
  const t = d.transaction;
  const open = d.aandachtspunten.filter((a) => !a.opgelost);
  const reqs = view.requests.filter((r) => r.status !== "afgehandeld");
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 2xl:grid-cols-4" data-tour="n-summary">
      <Card className="p-5">
        <CardTitle icon={<Home className="h-4 w-4 shrink-0 text-brand-600" />}>Object en koop</CardTitle>
        <KV className="mt-2" rows={[
          ["Kadastraal", d.property.kadastraal?.perceel ? `${d.property.kadastraal.gemeente} ${d.property.kadastraal.sectie} ${d.property.kadastraal.perceel}${d.property.kadastraal.grootte ? ` (${d.property.kadastraal.grootte})` : ""}` : "–"],
          ["Koopprijs", euro(t.koopprijs)],
          ["Roerende zaken", euro(t.roerendeZaken)],
          ["Leveringsdatum", <span key="l">{dateNl(t.leveringsdatum, { short: true })} <span className="text-xs font-normal text-ink-500">({t.leveringsdatumStatus ?? "voorlopig"}{t.leveringsdatumOrigineel && t.leveringsdatumOrigineel !== t.leveringsdatum ? `, orig. ${dateNl(t.leveringsdatumOrigineel, { short: true })}` : ""})</span></span>],
          ["Waarborgsom", t.waarborgsom?.bedrag ? `${euro(t.waarborgsom.bedrag)}${t.waarborgsom.ontvangen ? " (ontvangen)" : ""}` : "–"],
          ["Notaris in KO", t.notarisInKo ?? "–"],
        ]} />
      </Card>
      <Card className="p-5">
        <CardTitle icon={<Users className="h-4 w-4 shrink-0 text-brand-600" />}>Partijen</CardTitle>
        <ul className="mt-3 space-y-3">
          {view.parties.map((p) => (
            <li key={p.id} className="text-sm">
              <p className="flex items-center gap-2"><Badge tone={p.side === "koper" ? "koper" : "verkoper"}>{p.side}</Badge><span className="font-semibold text-ink-900">{personName(p.data.person) || p.displayName}</span></p>
              <p className="mt-0.5 text-xs text-ink-500">{p.data.person.geboortedatum ? `geb. ${dateNl(p.data.person.geboortedatum, { short: true })} te ${p.data.person.geboorteplaats ?? "?"}` : "geboortedatum onbekend"}, {p.data.person.burgerlijkeStaat ?? "staat onbekend"}{p.data.eigendom?.aandeel && p.side === "koper" ? `, aandeel ${p.data.eigendom.aandeel}` : ""}{p.side === "koper" && p.data.starters?.uitkomst ? `, OB: ${p.data.starters.uitkomst}` : ""}</p>
              <p className="mt-1 flex flex-wrap gap-x-3 text-xs text-ink-600"><span className="inline-flex items-center gap-1"><StateIcon state={p.data.idcheck?.status === "voltooid" ? "done" : "todo"} size="sm" />ID</span><span className="inline-flex items-center gap-1"><StateIcon state={["ondertekend", "verwerkt"].includes(p.data.volmacht?.status ?? "") ? "done" : p.data.volmacht?.status === "gepland" ? "in_progress" : "todo"} size="sm" />Volmacht</span><span className="inline-flex items-center gap-1"><StateIcon state={p.data.gegevensBevestigd ? "done" : "todo"} size="sm" />Gegevens</span></p>
            </li>
          ))}
        </ul>
      </Card>
      <Card className="p-5">
        <CardTitle icon={<Map className="h-4 w-4 shrink-0 text-brand-600" />}>Kadaster</CardTitle>
        <p className="mt-2 text-sm text-ink-600">{d.kadaster.status === "opgehaald" ? `Opgehaald ${dateNl(d.kadaster.opgehaaldOp, { short: true })}` : cap(label(KADASTER_STATUS, d.kadaster.status))}{d.kadaster.bron ? ` (${d.kadaster.bron})` : ""}</p>
        <ul className="mt-2 space-y-1.5 text-xs text-ink-700">
          {(d.kadaster.rechthebbenden ?? []).map((r) => <li key={r.naam} className="flex gap-1.5"><Check className="h-3.5 w-3.5 shrink-0 text-ok-600" />{r.naam}{r.aandeel ? ` (${r.aandeel})` : ""}</li>)}
          {(d.kadaster.registraties ?? []).map((r, i) => <li key={i} className="flex gap-1.5"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-ink-300" />{describeRegistratie(r).slice(0, 140)}{describeRegistratie(r).length > 140 ? "…" : ""}</li>)}
        </ul>
        <CardTitle as="h3" className="mt-4" icon={<Landmark className="h-4 w-4 shrink-0 text-brand-600" />}>Financiering</CardTitle>
        <p className="mt-1 text-sm text-ink-600">{d.financing.hypotheek === "nee" ? "Zonder hypotheek" : `${d.financing.geldverstrekker ?? "Geldverstrekker onbekend"}, ${label(FIN_STATUS, d.financing.status, "status onbekend")}, bankinstructie ${label(BANK_STATUS, d.financing.bankinstructieStatus, "nog niet verwacht")}`}</p>
      </Card>
      <Card className={cn("p-5", open.length > 0 && "border-warn-100")}>
        <CardTitle icon={<AlertTriangle className={cn("h-4 w-4 shrink-0", open.length ? "text-warn-600" : "text-ink-300")} />}>Open aandachtspunten ({open.length})</CardTitle>
        <ul className="mt-3 max-h-72 space-y-2 overflow-auto">
          {open.length === 0 && <li className="text-sm text-ink-500">Geen open aandachtspunten.</li>}
          {open.map((a) => (
            <li key={a.id} className={cn("rounded-lg p-2.5 text-xs", a.ernst === "kritiek" ? "bg-bad-50" : a.ernst === "let_op" ? "bg-warn-50" : "bg-ink-50")}>
              <p className="text-ink-800">{a.tekst}</p>
              <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2"><span className="text-ink-500">{a.bron}</span>{isNotary && <form action={resolvePunt.bind(null, view.dossier.id, a.id)}><button className="inline-flex items-center gap-1 rounded border border-ink-200 bg-white px-2 py-0.5 font-medium text-ink-700 hover:border-ink-400 hover:text-ink-900" title="Markeer dit aandachtspunt als afgehandeld"><Check className="h-3 w-3" />Markeer als afgehandeld</button></form>}</div>
            </li>
          ))}
        </ul>
        {reqs.length > 0 && (
          <>
            <CardTitle as="h3" className="mt-4 text-base" icon={<MessageSquareWarning className="h-4 w-4 shrink-0 text-brand-600" />}>Verzoeken aan klanten</CardTitle>
            <ul className="mt-2 space-y-2">{reqs.map((r) => <li key={r.id} className="rounded-lg bg-ink-50 p-2.5 text-xs"><p className="text-ink-800"><strong>{label(SIDE_LABEL, r.side)}:</strong> {r.title}</p><div className="mt-1 flex justify-between"><span className={r.status === "beantwoord" ? "font-semibold text-ok-700" : "text-ink-500"}>{cap(label(REQUEST_STATUS, r.status))}{r.documentId ? ", document ontvangen" : ""}</span>{isNotary && r.status === "beantwoord" && <form action={closeRequest.bind(null, view.dossier.id, r.id)}><button className="font-semibold text-ink-600">Afhandelen</button></form>}</div></li>)}</ul>
          </>
        )}
      </Card>
    </div>
  );
}
