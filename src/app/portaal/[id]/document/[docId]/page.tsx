import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download } from "lucide-react";
import { requireParty } from "@/lib/auth/guards";
import { canSeeDocument } from "@/lib/auth/documents";
import { DocView } from "@/components/docs/doc-view";
import type { DocIR } from "@/lib/docgen/ir";
import { buildVolmachtKoper, buildVolmachtVerkoper } from "@/lib/docgen/templates";
import { DOCUMENT_KINDS } from "@/lib/domain/types";
import { dateNl } from "@/lib/util/format";

export const metadata: Metadata = { title: "Document", robots: { index: false } };

export default async function Page({ params }: { params: Promise<{ id: string; docId: string }> }) {
  const { id, docId } = await params;
  const a = await requireParty(id, `/portaal/${id}/document/${docId}`);
  const doc = a.view.documents.find((d) => d.id === docId);
  if (!doc || !canSeeDocument(a.user, a.view, doc)) notFound();
  // Volmachten tonen we altijd met de actuele ondertekenstatus (de opgeslagen versie is van vóór de afspraak).
  const ir: DocIR | undefined = doc.kind === "volmacht_koper" ? buildVolmachtKoper(a.view) : doc.kind === "volmacht_verkoper" ? buildVolmachtVerkoper(a.view) : (doc.meta as { ir?: DocIR }).ir;
  return (
    <div>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href={`/portaal/${id}/documenten`} className="btn btn-ghost btn-sm -ml-2"><ArrowLeft className="h-4 w-4" />Documenten</Link>
          <h2 className="mt-2 text-xl text-ink-900">{doc.title}</h2>
          <p className="text-xs text-ink-500">{DOCUMENT_KINDS[doc.kind]}, {dateNl(doc.createdAt, { short: true })}{doc.version > 1 ? `, versie ${doc.version}` : ""}</p>
        </div>
        <a href={`/api/documenten/${doc.id}`} className="btn btn-secondary btn-sm"><Download className="h-4 w-4" />Download</a>
      </div>
      {ir ? <DocView ir={ir} marks={false} /> : <iframe title={doc.title} src={`/api/documenten/${doc.id}?inline=1`} className="h-[80vh] w-full rounded-2xl border border-ink-100 bg-white" />}
    </div>
  );
}
