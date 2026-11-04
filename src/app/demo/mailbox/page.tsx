import { desc } from "drizzle-orm";
import { ExternalLink, Inbox } from "lucide-react";
import { getDb, schema } from "@/lib/db";
import { Badge, Card, EmptyState } from "@/components/ui";
import { dateTimeNl } from "@/lib/util/format";

export default async function Page({ searchParams }: { searchParams: Promise<{ aan?: string }> }) {
  const sp = await searchParams;
  const db = await getDb();
  const all = await db.select().from(schema.emails).orderBy(desc(schema.emails.createdAt)).limit(300);
  const recipients = [...new Set(all.map((m) => m.to))];
  const list = sp.aan ? all.filter((m) => m.to === sp.aan) : all;
  return (
    <div className="container-page py-10">
      <h1 className="flex items-center gap-2 text-3xl font-extrabold text-ink-900"><Inbox className="h-7 w-7 text-brand-600" />Demo-mailbox</h1>
      <p className="mt-2 text-ink-600">In de demo worden geen echte e-mails verstuurd. Hier ziet u precies wat elke ontvanger zou krijgen; links in de berichten werken.</p>
      <div className="mt-6 flex flex-wrap gap-2"><a href="/demo/mailbox" className={`chip ${!sp.aan ? "bg-ink-900 text-white" : "bg-white ring-1 ring-ink-200"}`}>Alle ({all.length})</a>{recipients.map((r) => <a key={r} href={`/demo/mailbox?aan=${encodeURIComponent(r)}`} className={`chip ${sp.aan === r ? "bg-ink-900 text-white" : "bg-white text-ink-700 ring-1 ring-ink-200"}`}>{r}</a>)}</div>
      <div className="mt-6 space-y-3">
        {list.length === 0 && <EmptyState title="Nog geen e-mails" />}
        {list.map((m) => {
          const cta = m.html.match(/href="([^"]+)"[^>]*>([^<]+)<\/a>/);
          const href = cta ? cta[1].replace(/^https?:\/\/[^/]+/, "") : null;
          return (
            <Card key={m.id} className="p-0">
              <details>
                <summary className="flex cursor-pointer list-none flex-col gap-1 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <span className="min-w-0"><span className="block truncate font-semibold text-ink-900">{m.subject}</span><span className="block text-xs text-ink-500">Aan {m.to} · {dateTimeNl(m.createdAt)}</span></span>
                  <span className="flex items-center gap-2"><Badge>{m.template}</Badge>{href && <a href={href} className="btn btn-primary btn-sm"><ExternalLink className="h-3.5 w-3.5" />{cta![2]}</a>}</span>
                </summary>
                <iframe title={m.subject} srcDoc={m.html} sandbox="" className="h-[26rem] w-full border-t border-ink-100 bg-white" />
              </details>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
