import type { Metadata } from "next";
import { requireParty } from "@/lib/auth/guards";
import { eventsFor } from "@/lib/domain/dossier";
import { Card, EmptyState } from "@/components/ui";
import { dateTimeNl } from "@/lib/util/format";

export const metadata: Metadata = { title: "Activiteit", robots: { index: false } };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const a = await requireParty(id, `/portaal/${id}/activiteit`);
  const events = (await eventsFor(id)).filter((e) => e.visibleTo === "partijen" || e.visibleTo === a.side);
  // Kleur van de stip naar wie het deed: systeem, notaris, koper of verkoper.
  const sideOf = new Map(a.view.parties.filter((p) => p.userId).map((p) => [p.userId!, p.side]));
  const dot = (e: (typeof events)[number]) => {
    if (e.actorType === "systeem") return "bg-platform-600";
    if (e.actorType === "notaris") return "bg-notaris-600";
    const s = (e.actorId && sideOf.get(e.actorId)) || (e.visibleTo === "koper" || e.visibleTo === "verkoper" ? e.visibleTo : a.side);
    return s === "verkoper" ? "bg-verkoper-600" : "bg-koper-500";
  };
  return (
    <Card className="p-6">
      <h2 className="text-lg text-ink-900">Activiteit in je dossier</h2>
      {events.length === 0 ? <div className="mt-6"><EmptyState title="Nog geen activiteit">Hier zie je straks wat er in je dossier gebeurt: door jou, door ons en door de notaris.</EmptyState></div> : (
        <ol className="mt-6 max-w-3xl border-l-2 border-ink-100 pl-6">
          {events.map((e) => (
            <li key={e.id} className="relative pb-6 last:pb-0">
              <span className={`absolute -left-[31px] top-1 h-3 w-3 rounded-full ring-4 ring-white ${dot(e)}`} />
              <p className="text-sm text-ink-800">{e.message}</p>
              <p className="text-xs text-ink-400">{dateTimeNl(e.createdAt)} · {e.actorName ?? (e.actorType === "systeem" ? "Akteloket (automatisch)" : e.actorType)}</p>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}
