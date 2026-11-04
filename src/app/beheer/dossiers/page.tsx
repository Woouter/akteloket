import { summaries } from "@/lib/domain/overview";
import { PageTitle } from "@/components/staff/shell";
import { PipelineTable } from "@/components/staff/pipeline";

export default async function Page() {
  const all = await summaries();
  return (<><PageTitle title="Dossiers" sub="Alle dossiers met voortgang per partij" /><PipelineTable rows={all} base="beheer" /></>);
}
