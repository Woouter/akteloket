import { desc } from "drizzle-orm";
import { ChevronRight, ExternalLink, Inbox } from "lucide-react";
import { getDb, schema } from "@/lib/db";
import { Badge, Card, EmptyState } from "@/components/ui";
import { dateTimeNl } from "@/lib/util/format";

/** Wie ontvangt dit soort bericht (in plaats van de technische sjabloonnaam). */
function audience(template: string): string {
  const role = template.split(".")[0];
  return { koper: "Aan koper", verkoper: "Aan verkoper", notaris: "Aan notaris", ko: "Koopovereenkomst", nota: "Nota van afrekening", medepartij: "Aan medekoper" }[role] ?? "Bericht";
}

/**
 * Links in de voorbeeldweergave: absolute adressen (bijv. https://demo.akte-loket.nl/…) worden
 * relatief gemaakt en openen in het hoofdvenster. Anders laadt de link ín het voorbeeldkader en
 * weigert de site zich daar te tonen.
 */
function previewHtml(html: string): string {
  return html.replace(/<a\s([^>]*?)href="https?:\/\/[^/"]+(\/[^"]*)?"/g, (_m, pre: string, path?: string) => `<a ${pre.replace(/\starget="[^"]*"/, "")}target="_top" href="${path || "/"}"`);
}

export default async function Page({ searchParams }: { searchParams: Promise<{ aan?: string }> }) {
  const sp = await searchParams;
  const db = await getDb();
  const all = await db.select().from(schema.emails).orderBy(desc(schema.emails.createdAt)).limit(300);
  const recipients = [...new Set(all.map((m) => m.to))];
  const list = sp.aan ? all.filter((m) => m.to === sp.aan) : all;
  return (
    <div className="container-page py-10">
      <h1 className="flex items-center gap-2 font-serif text-3xl font-semibold text-ink-900"><Inbox className="h-7 w-7 shrink-0 text-brand-600" />Demo-mailbox</h1>
      <p className="mt-2 max-w-3xl text-ink-600">In de demo worden geen echte e-mails verstuurd. Hier ziet u precies wat elke ontvanger zou krijgen. Klik op een bericht om het te lezen; de knop opent de bijbehorende pagina in de demo. Links naar een klantportaal tonen dat portaal zodra u de tour van die klant heeft gevolgd; bent u als notaris ingelogd, dan opent het dossier in uw eigen werkomgeving.</p>
      <div className="mt-6 flex flex-wrap gap-2"><a href="/demo/mailbox" className={`chip ${!sp.aan ? "bg-ink-900 text-white" : "bg-white ring-1 ring-ink-200"}`}>Alle ({all.length})</a>{recipients.map((r) => <a key={r} href={`/demo/mailbox?aan=${encodeURIComponent(r)}`} className={`chip ${sp.aan === r ? "bg-ink-900 text-white" : "bg-white text-ink-700 ring-1 ring-ink-200"}`}>{r}</a>)}</div>
      <div className="mt-6 space-y-3">
        {list.length === 0 && <EmptyState title="Nog geen e-mails" />}
        {list.map((m) => {
          const cta = m.html.match(/href="([^"]+)"[^>]*>([^<]+)<\/a>/);
          const href = cta ? cta[1].replace(/^https?:\/\/[^/]+/, "") : null;
          return (
            <Card key={m.id} className="p-0">
              <details className="group">
                <summary className="flex cursor-pointer list-none flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between [&::-webkit-details-marker]:hidden">
                  <span className="flex min-w-0 items-start gap-2"><ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-ink-400 transition-transform group-open:rotate-90" aria-hidden /><span className="min-w-0"><span className="block truncate font-semibold text-ink-900">{m.subject}</span><span className="block truncate text-xs text-ink-500">Aan {m.to} · {dateTimeNl(m.createdAt)}</span></span></span>
                  <span className="flex shrink-0 flex-wrap items-center gap-2 pl-6 sm:pl-0"><span title={m.template}><Badge>{audience(m.template)}</Badge></span>{href && <a href={href} className="btn btn-primary btn-sm"><ExternalLink className="h-3.5 w-3.5" />{cta![2]}</a>}</span>
                </summary>
                <iframe title={m.subject} srcDoc={previewHtml(m.html)} sandbox="allow-top-navigation-by-user-activation" className="h-[26rem] w-full border-t border-ink-100 bg-white" />
              </details>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
