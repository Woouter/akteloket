import { Check, Landmark, Mail, ShieldCheck, Banknote } from "lucide-react";
import type { PartyAccess } from "@/lib/auth/guards";
import { Card, KV, Notice, StateIcon } from "@/components/ui";
import { saveZekerheden, approveNota } from "@/app/portaal/actions";
import { NotaTable } from "./nota-table";
import { dateNl, dateTimeNl, euro, formatIban } from "@/lib/util/format";
import { WhyBox } from "./frame";

export function UitnodigingStep({ a }: { a: PartyAccess }) {
  return (
    <Card className="divide-y divide-ink-100 p-0">
      {a.mine.map((p) => (
        <div key={p.id} className="flex items-center justify-between gap-4 p-5">
          <span className="flex min-w-0 items-center gap-3"><StateIcon state={p.activatedAt ? "done" : "todo"} size="sm" /><span className="min-w-0"><span className="block font-semibold text-ink-900">{p.displayName}</span><span className="block text-xs text-ink-500"><Mail className="mr-1 inline h-3 w-3" />{p.email ?? "e-mailadres onbekend"}</span></span></span>
          <span className="shrink-0 text-right text-sm text-ink-600">{p.activatedAt ? `Geactiveerd ${dateNl(p.activatedAt, { short: true })}` : p.invitedAt ? `Uitgenodigd ${dateNl(p.invitedAt, { short: true })}` : "Nog niet uitgenodigd"}</span>
        </div>
      ))}
    </Card>
  );
}

export function ZekerhedenStep({ a }: { a: PartyAccess }) {
  const pos = a.view.payoffs;
  const confirmed = a.mine.some((p) => p.data.meta?.zekerhedenBevestigd);
  const label = { op_te_vragen: "Op te vragen", aangevraagd: "Aangevraagd", ontvangen: "Ontvangen", gecontroleerd: "Gecontroleerd" };
  return (
    <div className="space-y-5" data-tour="zekerheden">
      <form action={saveZekerheden.bind(null, a.view.dossier.id)} className="space-y-5">
        <Card className="p-6">
          <h3 className="flex items-center gap-2 text-lg text-ink-900"><Landmark className="h-5 w-5 text-brand-600" />Bestaande hypotheken op de woning</h3>
          {pos.length ? <p className="mt-1 text-sm text-ink-600">Uit de kadastrale registratie blijkt de volgende inschrijving. Vul je leningnummer(s) aan, dan kan de notaris de aflosnota direct opvragen.</p> : <p className="mt-1 text-sm text-ink-600">In de kadastrale registratie hebben we geen hypotheekinschrijving gevonden.</p>}
          <div className="mt-5 space-y-3">
            {pos.map((p) => (
              <div key={p.id} className="rounded-xl border border-ink-100 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2"><p className="font-semibold text-ink-900">{p.lender}</p><span className={`chip ${p.status === "gecontroleerd" || p.status === "ontvangen" ? "bg-ok-100 text-ok-700" : "bg-ink-100 text-ink-600"}`}>Aflosnota: {label[p.status]}</span></div>
                <p className="text-xs text-ink-500">{p.inschrijving} (bron: {p.source === "kadaster" ? "kadastrale registratie" : "opgave verkoper"})</p>
                <label className="mt-3 block max-w-sm"><span className="label">Leningnummer(s)</span><input className="input" name={`lening_${p.id}`} defaultValue={p.loanNumbers ?? ""} placeholder="Staat op je jaaroverzicht" /></label>
                {p.amount && <p className="mt-2 text-sm text-ink-700">Af te lossen volgens aflosnota: <strong>{euro(p.amount / 100)}</strong>{p.validUntil ? ` (geldig t/m ${dateNl(p.validUntil)})` : ""}</p>}
              </div>
            ))}
          </div>
          <div className="mt-5 grid gap-4 border-t border-ink-100 pt-5 sm:grid-cols-2">
            <p className="text-sm text-ink-600 sm:col-span-2">Rust er nog een andere lening met zekerheid op de woning? Vul die hier aan (optioneel).</p>
            <label className="block"><span className="label">Andere geldverstrekker</span><input className="input" name="extraLender" placeholder="Naam geldverstrekker" /></label>
            <label className="block"><span className="label">Leningnummer</span><input className="input" name="extraLening" /></label>
            {!pos.length && <label className="sm:col-span-2 flex items-center gap-3 text-sm"><input type="checkbox" name="geen" className="h-5 w-5 accent-[var(--color-brand-600)]" />Er rust geen hypotheek of andere lening op de woning</label>}
          </div>
        </Card>
        <Card className="p-6">
          <label className="flex cursor-pointer gap-3 text-sm"><input type="checkbox" name="toestemming" defaultChecked={pos.some((p) => p.toestemmingVerkoper)} className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--color-brand-600)]" required={pos.length > 0} /><span className="text-ink-700">Ik geef de notaris toestemming de aflosnota(&apos;s) op te vragen bij mijn geldverstrekker(s), de hypotheek uit de verkoopopbrengst af te lossen en de doorhaling van de inschrijving(en) te verzorgen.</span></label>
          <div className="mt-4 flex justify-end"><button className="btn btn-primary"><Check className="h-4 w-4" />{confirmed ? "Bijwerken" : "Bevestigen"}</button></div>
        </Card>
      </form>
      <WhyBox><p>De woning moet vrij van hypotheken worden geleverd. De notaris vraagt daarom de officiële aflosnota op bij je geldverstrekker, controleert het bedrag, lost af uit de verkoopopbrengst en laat het hypotheekrecht doorhalen in het Kadaster.</p></WhyBox>
    </div>
  );
}

export function NotaVerkoperStep({ a }: { a: PartyAccess }) {
  const nota = a.view.data.notaVerkoper;
  const ib = a.me.data.iban;
  return (
    <div className="space-y-5" data-tour="nota">
      <Card className="p-6">
        <h3 className="flex items-center gap-2 text-lg text-ink-900"><Banknote className="h-5 w-5 text-verkoper-600" />Nota van afrekening verkoper</h3>
        {nota && nota.status !== "in_voorbereiding" ? (
          <>
            <NotaTable nota={nota} side="verkoper" />
            <p className="mt-4 text-sm text-ink-600">Uitbetaling na inschrijving van de akte en controle van de openbare registers op <strong className="text-ink-900">{formatIban(ib?.iban)}</strong> t.n.v. {ib?.tenaamstelling}.</p>
            {nota.uitbetaaldOp ? <Notice tone="ok" className="mt-4">Uitbetaald op {dateTimeNl(nota.uitbetaaldOp)}.</Notice> : <form action={approveNota.bind(null, a.view.dossier.id)} className="mt-4"><button className="btn btn-primary btn-sm"><Check className="h-4 w-4" />Nota gezien en akkoord</button></form>}
          </>
        ) : (
          <>
            <p className="mt-2 text-sm text-ink-600">De notaris stelt de nota op kort voor de overdracht. Dit is de voorlopige berekening op basis van de gegevens die er nu zijn:</p>
            {nota && <NotaTable nota={nota} side="verkoper" />}
            <p className="mt-3 text-xs text-ink-400">Status: in voorbereiding. De bedragen kunnen nog wijzigen.</p>
          </>
        )}
      </Card>
      <KV className="card p-5" rows={[["Status nota", nota?.status === "definitief" ? "Definitief" : nota?.status === "beschikbaar" ? "Beschikbaar" : "In voorbereiding"], ["Uitbetalings-IBAN", formatIban(ib?.iban) || "Nog niet opgegeven"], ["Aflosnota's", a.view.payoffs.map((p) => `${p.lender}: ${{ op_te_vragen: "op te vragen", aangevraagd: "aangevraagd", ontvangen: "ontvangen", gecontroleerd: "gecontroleerd" }[p.status]}`).join(", ") || "Geen"]]} />
      <p className="flex items-center gap-2 text-xs text-ink-500"><ShieldCheck className="h-4 w-4" />De koper ziet jouw nota en rekeninggegevens niet.</p>
    </div>
  );
}
