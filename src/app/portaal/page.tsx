import Link from "next/link";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { ArrowRight, Home } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { getDb, schema } from "@/lib/db";
import { Badge, EmptyState } from "@/components/ui";
import { SERVICES } from "@/lib/config";
import { dateNl, propertyLine } from "@/lib/util/format";

export default async function Page() {
  const user = await requireUser(undefined, "/portaal");
  if (user.role === "notaris") redirect("/notaris");
  if (user.role === "beheer") redirect("/beheer");
  const db = await getDb();
  const rows = await db.select({ party: schema.parties, dossier: schema.dossiers }).from(schema.parties).innerJoin(schema.dossiers, eq(schema.dossiers.id, schema.parties.dossierId)).where(eq(schema.parties.userId, user.id));
  const list = rows.filter((r) => r.dossier.status !== "concept");
  if (list.length === 1) redirect(`/portaal/${list[0].dossier.id}`);
  return (
    <main className="container-page max-w-3xl py-12">
      <h1 className="text-3xl font-semibold text-ink-900">Mijn dossiers</h1>
      <div className="mt-8 space-y-4">
        {list.length === 0 && <EmptyState icon={<Home className="h-10 w-10" />} title="Nog geen dossiers">Start een aanvraag om je eerste dossier aan te maken. <Link href="/aanvraag" className="text-brand-700 underline">Start je aanvraag</Link></EmptyState>}
        {list.map(({ dossier, party }) => (
          <Link key={dossier.id} href={`/portaal/${dossier.id}`} className="card flex items-center justify-between gap-4 p-5 hover:shadow-lift">
            <div>
              <div className="flex gap-2"><Badge tone={party.side === "koper" ? "koper" : "verkoper"}>{party.side}</Badge><Badge>{SERVICES[dossier.data.service].short}</Badge></div>
              <p className="mt-2 font-semibold text-ink-900">{propertyLine(dossier.data.property) || dossier.reference}</p>
              <p className="text-sm text-ink-500">Overdracht {dateNl(dossier.data.transaction.leveringsdatum)}</p>
            </div>
            <ArrowRight className="h-5 w-5 text-ink-300" />
          </Link>
        ))}
      </div>
    </main>
  );
}
