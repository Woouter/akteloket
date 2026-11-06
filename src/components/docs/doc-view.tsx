import type { DocIR, Run } from "@/lib/docgen/ir";
import { cn } from "@/lib/util/format";

function R({ r, marks }: { r: Run; marks: boolean }) {
  if (typeof r === "string") return <>{r}</>;
  if (!marks) return <>{r.k === "check" ? "" : r.t}</>;
  if (r.k === "filled") return <span className="field-filled" title={`Bron: ${r.src}`}>{r.t}</span>;
  if (r.k === "missing") return <span className="field-mark !border-bad-600 !bg-bad-100 font-sans text-[0.85em] font-semibold text-bad-700">{r.t}</span>;
  return <span className="field-mark font-sans text-[0.8em] font-semibold text-warn-700" title={r.src}>⚑ {r.src}</span>;
}

/** Rendert een gegenereerd document (akte, volmacht, nota) als leesbare pagina. */
export function DocView({ ir, marks = true, className }: { ir: DocIR; marks?: boolean; className?: string }) {
  return (
    <div className={cn("prose-akte mx-auto max-w-[46rem] rounded-sm bg-white px-6 py-10 shadow-card ring-1 ring-ink-100 sm:px-14 sm:py-14", className)}>
      {ir.concept && <p className="mb-6 text-right font-sans text-[11px] font-bold uppercase tracking-wider text-warn-700">Concept, ter controle en vaststelling door de notaris</p>}
      {ir.blocks.map((b, i) => {
        switch (b.type) {
          case "title": return <p key={i} className="text-center text-2xl font-bold tracking-wide">{b.text}</p>;
          case "subtitle": return <p key={i} className="mb-8 text-center font-sans text-sm text-ink-500">{b.text}</p>;
          case "h": return <h2 key={i} style={{ letterSpacing: "0.08em", fontWeight: 700 }}>{b.text}</h2>; // inline: de globale kopstijl (buiten @layer) overstemt anders .prose-akte h2
          case "p": return <p key={i} className="hyphens-auto sm:text-justify">{b.runs.map((r, j) => <R key={j} r={r} marks={marks} />)}</p>;
          case "li": return <p key={i} className="pl-6 -indent-6">{b.n ? <span className="inline-block w-6 indent-0">{b.n}</span> : null}{b.runs.map((r, j) => <R key={j} r={r} marks={marks} />)}</p>;
          case "note": return <p key={i} className="font-sans text-sm italic text-ink-500">{b.text}</p>;
          case "sig": return <div key={i} className="mt-8 space-y-6">{b.lines.map((l) => <p key={l}>{l}</p>)}</div>;
          case "table": return (
            <table key={i} className="my-4 w-full table-fixed font-sans text-sm sm:table-auto">
              <tbody>{b.rows.map((r, j) => <tr key={j} className={cn("border-b border-ink-100", r.strong && "border-t-2 border-ink-900 font-bold")}><td className="w-2/5 py-2 pr-3 align-top sm:w-auto sm:pr-4">{r.label}</td><td className="break-words py-2 text-right align-top tabular sm:whitespace-nowrap">{r.value.map((v, k) => <R key={k} r={v} marks={marks} />)}</td></tr>)}</tbody>
            </table>
          );
        }
      })}
    </div>
  );
}
