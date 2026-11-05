import type { Metadata } from "next";
import Link from "next/link";
import { Download, Eye, FileText, Lock } from "lucide-react";
import { requireParty } from "@/lib/auth/guards";
import { canSeeDocument } from "@/lib/auth/documents";
import { Card, EmptyState } from "@/components/ui";
import { dateNl } from "@/lib/util/format";
import { DOCUMENT_KINDS } from "@/lib/domain/types";

export const metadata: Metadata = { title: "Documenten", robots: { index: false } };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const a = await requireParty(id, `/portaal/${id}/documenten`);
  const docs = a.view.documents.filter((d) => canSeeDocument(a.user, a.view, d) && (!d.kind.startsWith("concept_") || d.kind === "concept_koopovereenkomst") && d.kind !== "aflosnota_verzoek");
  return (
    <Card className="p-0" data-tour="docs-list">
      <div className="flex items-center justify-between border-b border-ink-100 p-5">
        <h2 className="text-lg text-ink-900">Documenten</h2>
        <span className="flex items-center gap-1.5 text-xs text-ink-500"><Lock className="h-3.5 w-3.5" />Versleuteld opgeslagen</span>
      </div>
      {docs.length === 0 ? <div className="p-6"><EmptyState title="Nog geen documenten">Zodra er stukken voor je klaarstaan of je iets uploadt, vind je ze hier.</EmptyState></div> : (
        <ul className="divide-y divide-ink-100">
          {docs.map((d) => {
            const viewable = !!(d.meta as { ir?: unknown }).ir || d.mime === "application/pdf";
            return (
              <li key={d.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-ink-50 text-ink-500"><FileText className="h-5 w-5" /></span>
                  <div className="min-w-0"><p className="truncate font-semibold text-ink-900">{d.title}</p><p className="text-xs text-ink-500">{DOCUMENT_KINDS[d.kind]} · {dateNl(d.createdAt, { short: true })}{d.version > 1 ? ` · versie ${d.version}` : ""}</p></div>
                </div>
                <div className="flex gap-2">
                  {viewable && <Link href={`/portaal/${id}/document/${d.id}`} className="btn btn-secondary btn-sm"><Eye className="h-4 w-4" />Bekijken</Link>}
                  <a href={`/api/documenten/${d.id}`} className="btn btn-ghost btn-sm"><Download className="h-4 w-4" />Download</a>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
