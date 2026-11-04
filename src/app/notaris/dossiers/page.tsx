import { summaries } from "@/lib/domain/overview";
import { PageTitle } from "@/components/staff/shell";
import { PipelineTable } from "@/components/staff/pipeline";

export default async function Page() {
  const all = await summaries();
  return (<><PageTitle title="Alle dossiers" sub={`${all.length} dossiers, gesorteerd op passeerdatum`} /><PipelineTable rows={all} base="notaris" /></>);
}
