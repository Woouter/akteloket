import { desc } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { PageTitle } from "@/components/staff/shell";
import { Badge, Card } from "@/components/ui";
import { dateTimeNl } from "@/lib/util/format";

export default async function Page() {
  const db = await getDb();
  const mails = await db.select().from(schema.emails).orderBy(desc(schema.emails.createdAt)).limit(200);
  return (
    <>
      <PageTitle title="Uitgaande e-mail" sub="Alle berichten worden gelogd. In de demo-omgeving worden ze gesimuleerd en niet echt verzonden." />
      <Card className="divide-y divide-ink-100 p-0" data-tour="b-emails">
        {mails.map((m) => (
          <details key={m.id} className="p-4">
            <summary className="flex cursor-pointer list-none flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <span className="min-w-0"><span className="block truncate font-semibold text-ink-900">{m.subject}</span><span className="block text-xs text-ink-500">{m.to} · <span className="font-mono">{m.template}</span></span></span>
              <span className="flex shrink-0 items-center gap-2 text-xs text-ink-500">{dateTimeNl(m.createdAt)}<Badge tone={m.status === "verzonden" ? "ok" : m.status === "mislukt" ? "bad" : "neutral"}>{m.status}</Badge></span>
            </summary>
            <iframe title={m.subject} srcDoc={m.html} className="mt-3 h-[28rem] w-full rounded-xl border border-ink-100 bg-white" sandbox="" />
          </details>
        ))}
      </Card>
    </>
  );
}
