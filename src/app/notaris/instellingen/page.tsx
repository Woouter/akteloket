import { CheckCircle2, Save } from "lucide-react";
import { getOffice, getWwftMatrix } from "@/lib/domain/settings";
import { saveMatrix, saveOffice } from "@/app/notaris/actions";
import { PageTitle } from "@/components/staff/shell";
import { Card, Notice } from "@/components/ui";
import { TAX_YEARS, TERMS } from "@/lib/config";
import { CardTitle } from "@/components/staff/card-title";
import { numberNl, pctNl } from "@/lib/util/format";

export default async function Page({ searchParams }: { searchParams: Promise<{ opgeslagen?: string }> }) {
  const sp = await searchParams;
  const [matrix, office] = await Promise.all([getWwftMatrix(), getOffice()]);
  return (
    <>
      <PageTitle title="Instellingen" sub="Wat u hier vastlegt, werkt direct door in de vragen en documentverzoeken aan klanten." />
      {sp.opgeslagen === "matrix" && <Notice tone="ok" className="mb-5" icon={<CheckCircle2 className="h-4 w-4 text-ok-600" />}>De Wwft-documentmatrix is opgeslagen en geldt direct voor nieuwe klantvragen.</Notice>}
      <form action={saveMatrix} data-tour="n-matrix" id="matrix" className="scroll-mt-6">
        <Card className="p-0">
          <div className="border-b border-ink-100 p-5">
            <CardTitle>Wwft-documentmatrix</CardTitle>
            <p className="mt-1 text-sm text-ink-600">Per geldbron: welke bewijsstukken de tool direct opvraagt, vanaf welk bedrag aanvullende onderbouwing nodig is, en of de regel door u is goedgekeurd. Volgens het procesdocument is dit het belangrijkste validatiepunt.</p>
          </div>
          <div className="divide-y divide-ink-100">
            {matrix.map((r) => (
              <div key={r.type} className="grid gap-4 p-5 lg:grid-cols-[12rem_minmax(0,1fr)_18rem]">
                <div><p className="font-semibold text-ink-900">{r.label}</p><select name={`status_${r.type}`} defaultValue={r.status} className="select mt-2"><option value="voorlopig">Voorlopig</option><option value="goedgekeurd">Goedgekeurd</option></select></div>
                <label className="block"><span className="label">Documenten (één per regel)</span><textarea name={`docs_${r.type}`} rows={3} defaultValue={r.documenten.join("\n")} className="textarea" /></label>
                <div className="space-y-2">
                  <label className="block"><span className="label">Drempelbedrag (€)</span><input name={`drempel_${r.type}`} defaultValue={r.drempel ?? ""} inputMode="numeric" placeholder="Geen drempel" className="input" /></label>
                  <label className="block"><span className="label">Aanvullend boven drempel</span><textarea name={`aanvullend_${r.type}`} rows={2} defaultValue={r.aanvullend ?? ""} className="textarea text-sm" /></label>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-end border-t border-ink-100 p-5"><button className="btn btn-primary"><Save className="h-4 w-4" />Documentmatrix opslaan</button></div>
        </Card>
      </form>
      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <form action={saveOffice} id="kantoor" className="min-w-0 scroll-mt-6">
          <Card className="p-5">
            <CardTitle>Volmacht en identificatie</CardTitle>
            {sp.opgeslagen === "kantoor" && <Notice tone="ok" className="mt-3" icon={<CheckCircle2 className="h-4 w-4 text-ok-600" />}>Volmacht- en identificatie-instellingen opgeslagen.</Notice>}
            <div className="mt-4 space-y-4 text-sm">
              <div><span className="label">Ondertekening volmacht</span><label className="mr-4 inline-flex items-center gap-2"><input type="checkbox" name="mode_video" defaultChecked={office.volmachtModes.includes("video")} />Via video</label><label className="inline-flex items-center gap-2"><input type="checkbox" name="mode_kantoor" defaultChecked={office.volmachtModes.includes("kantoor")} />Op kantoor</label></div>
              <label className="block max-w-sm"><span className="label">Legalisatie handtekening verkoper</span><select name="verkoperLegalisatie" defaultValue={office.verkoperLegalisatie} className="select"><option value="niet_vereist">Niet vereist (video-afspraak volstaat)</option><option value="keuze">Keuze verkoper</option><option value="altijd">Altijd vereist</option></select></label>
              <div><span className="label">Identificatiemethoden</span><label className="mr-4 inline-flex items-center gap-2"><input type="checkbox" name="id_idin" defaultChecked={office.idMethods.includes("idin")} />iDIN</label><label className="inline-flex items-center gap-2"><input type="checkbox" name="id_nfc_app" defaultChecked={office.idMethods.includes("nfc_app")} />NFC-ID-app</label></div>
              <div className="grid grid-cols-3 gap-3"><label><span className="label">Agenda van</span><input name="slotStart" defaultValue={office.slotStart} className="input" /></label><label><span className="label">tot</span><input name="slotEnd" defaultValue={office.slotEnd} className="input" /></label><label><span className="label">Duur (min)</span><input name="slotMinutes" defaultValue={office.slotMinutes} className="input" /></label></div>
            </div>
            <div className="mt-5 flex justify-end"><button className="btn btn-primary"><Save className="h-4 w-4" />Instellingen opslaan</button></div>
          </Card>
        </form>
        <Card className="min-w-0 p-5">
          <CardTitle>Termijnen en fiscale tabellen</CardTitle>
          <ul className="mt-3 space-y-1.5 text-sm text-ink-700">
            <li>Datumcontrole: {TERMS.datumCheckDagenVooraf} dagen vóór levering · herinnering na {TERMS.herinneringNaDagen} dagen · signaal na nog {TERMS.signaalNotarisNaDagen} dagen</li>
            <li>Bankinstructie uiterlijk verwacht: {TERMS.bankinstructieUiterlijkDagenVooraf} dagen vóór passeren</li>
          </ul>
          <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[26rem] text-sm"><thead className="text-left text-xs text-ink-500"><tr><th className="py-1.5 pr-3 font-medium">Jaar</th><th className="pr-3 font-medium">Startersgrens</th><th className="pr-3 font-medium">Hoofdverblijf</th><th className="pr-3 font-medium">Overig</th><th className="font-medium">Status</th></tr></thead><tbody className="divide-y divide-ink-100">{TAX_YEARS.map((t) => <tr key={t.year}><td className="py-1.5 pr-3 font-semibold tabular">{t.year}</td><td className="pr-3 tabular">€ {numberNl(t.startersGrens, 0)}</td><td className="pr-3 tabular">{pctNl(t.tariefHoofdverblijf)}</td><td className="pr-3 tabular">{pctNl(t.tariefOverigeWoning)}</td><td>{t.status}</td></tr>)}</tbody></table></div>
          <p className="mt-3 text-xs text-ink-500">Grensbedragen en tarieven worden per kalenderjaar bijgehouden; de toets gebruikt altijd het jaar van de leveringsdatum. Wijzigingen in deze tabel lopen via het platformteam.</p>
        </Card>
      </div>
    </>
  );
}
