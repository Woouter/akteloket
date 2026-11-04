import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download } from "lucide-react";
import { requireParty } from "@/lib/auth/guards";
import { canSeeDocument } from "@/lib/auth/documents";
import { DocView } from "@/components/docs/doc-view";
import type { DocIR } from "@/lib/docgen/ir";

export default async function Page({ params }: { params: Promise<{ id: string; docId: string }> }) {
  const { id, docId } = await params;
  const a = await requireParty(id);
  const doc = a.view.documents.find((d) => d.id === docId);
  if (!doc || !canSeeDocument(a.user, a.view, doc)) notFound();
  const ir = (doc.meta as { ir?: DocIR }).ir;
  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <Link href={`/portaal/${id}/documenten`} className="btn btn-ghost btn-sm"><ArrowLeft className="h-4 w-4" />Documenten</Link>
        <a href={`/api/documenten/${doc.id}`} className="btn btn-secondary btn-sm"><Download className="h-4 w-4" />Download</a>
      </div>
      {ir ? <DocView ir={ir} marks={false} /> : <iframe title={doc.title} src={`/api/documenten/${doc.id}?inline=1`} className="h-[80vh] w-full rounded-2xl border border-ink-100 bg-white" />}
    </div>
  );
}
