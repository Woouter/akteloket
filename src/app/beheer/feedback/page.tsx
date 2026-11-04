import Link from "next/link";
import { desc } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { PageTitle } from "@/components/staff/shell";
import { Badge, Card, EmptyState } from "@/components/ui";
import { dateTimeNl } from "@/lib/util/format";

export default async function Page() {
  const db = await getDb();
  const fb = await db.select().from(schema.feedback).orderBy(desc(schema.feedback.createdAt));
  const tone = { akkoord: "ok", aanpassen: "warn", schrappen: "bad", toevoegen: "brand" } as const;
  return (
    <>
      <PageTitle title="Pilotfeedback" sub={<>Beoordelingen per onderdeel uit het <Link href="/demo/validatie" className="text-brand-700 underline">beoordelingskader</Link></>} />
      {fb.length === 0 ? <EmptyState title="Nog geen feedback">De notaris kan per onderdeel akkoord, aanpassen, schrappen of toevoegen aangeven.</EmptyState> : (
        <Card className="divide-y divide-ink-100 p-0">{fb.map((f) => <div key={f.id} className="p-4 text-sm"><div className="flex flex-wrap items-center justify-between gap-2"><span className="font-semibold text-ink-900">{f.component}</span><span className="flex items-center gap-2"><Badge tone={tone[f.verdict]}>{f.verdict}</Badge><span className="text-xs text-ink-400">{f.author} · {dateTimeNl(f.createdAt)}</span></span></div>{f.comment && <p className="mt-1 text-ink-600">{f.comment}</p>}</div>)}</Card>
      )}
    </>
  );
}
