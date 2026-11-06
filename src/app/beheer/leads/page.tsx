import { desc } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { PageTitle } from "@/components/staff/shell";
import { Badge, Card, EmptyState } from "@/components/ui";
import { dateTimeNl } from "@/lib/util/format";

export default async function Page() {
  const db = await getDb();
  const leads = await db.select().from(schema.leads).orderBy(desc(schema.leads.createdAt));
  return (
    <>
      <PageTitle title="Leads en partners" sub="Contactformulieren en aanmeldingen van makelaars en hypotheekadviseurs" />
      {leads.length === 0 ? <EmptyState title="Nog geen aanvragen" /> : (
        <Card className="divide-y divide-ink-100 p-0">{leads.map((l) => <div key={l.id} className="p-4 text-sm"><div className="flex flex-wrap items-center justify-between gap-2"><span className="font-semibold text-ink-900">{l.name} <span className="font-normal text-ink-500">({l.email}{l.phone ? `, ${l.phone}` : ""})</span></span><span className="flex items-center gap-2"><Badge tone={l.kind === "partner" ? "brand" : "neutral"}>{l.kind}</Badge><span className="text-xs text-ink-400">{dateTimeNl(l.createdAt)}</span></span></div>{l.message && <p className="mt-1 text-ink-600">{l.message}</p>}</div>)}</Card>
      )}
    </>
  );
}
