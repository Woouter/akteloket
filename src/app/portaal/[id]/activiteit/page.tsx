import { requireParty } from "@/lib/auth/guards";
import { eventsFor } from "@/lib/domain/dossier";
import { Card } from "@/components/ui";
import { dateTimeNl } from "@/lib/util/format";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const a = await requireParty(id);
  const events = (await eventsFor(id)).filter((e) => e.visibleTo === "partijen" || e.visibleTo === a.side);
  return (
    <Card className="max-w-3xl p-6">
      <h2 className="text-lg font-bold text-ink-900">Activiteit in je dossier</h2>
      <ol className="mt-6 border-l-2 border-ink-100 pl-6">
        {events.map((e) => (
          <li key={e.id} className="relative pb-6 last:pb-0">
            <span className={`absolute -left-[31px] top-1 h-3 w-3 rounded-full ring-4 ring-white ${e.actorType === "systeem" ? "bg-platform-600" : e.actorType === "notaris" ? "bg-notaris-600" : "bg-koper-500"}`} />
            <p className="text-sm text-ink-800">{e.message}</p>
            <p className="text-xs text-ink-400">{dateTimeNl(e.createdAt)} · {e.actorName ?? e.actorType}</p>
          </li>
        ))}
      </ol>
    </Card>
  );
}
