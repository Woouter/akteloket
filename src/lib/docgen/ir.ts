/**
 * Tussenformaat voor gegenereerde documenten. Wordt opgeslagen in document.meta.ir
 * en gerenderd naar HTML (preview in portaal) en DOCX (bewerkbaar voor de notaris).
 *
 * Een "filled"-run is een gegeven dat uit een bron is overgenomen (met bronlabel),
 * een "missing"-run een ontbrekend gegeven (nooit aangenomen), een "check"-run een
 * expliciet controlepunt voor de notaris.
 */
export type Run = string | { t: string; k: "filled" | "missing" | "check"; src?: string };
export type Block =
  | { type: "title"; text: string }
  | { type: "subtitle"; text: string }
  | { type: "h"; text: string }
  | { type: "p"; runs: Run[] }
  | { type: "li"; runs: Run[]; n?: string }
  | { type: "table"; rows: { label: string; value: Run[]; strong?: boolean }[] }
  | { type: "sig"; lines: string[] }
  | { type: "note"; text: string };

export interface DocIR {
  title: string;
  subtitle?: string;
  concept: boolean;
  blocks: Block[];
  controlepunten: string[];
  bronnen: { label: string; bron: string }[];
}

export class IRBuilder {
  blocks: Block[] = [];
  controlepunten: string[] = [];
  bronnen: { label: string; bron: string }[] = [];
  private srcSeen = new Map<string, number>();
  title(t: string) { this.blocks.push({ type: "title", text: t }); return this; }
  subtitle(t: string) { this.blocks.push({ type: "subtitle", text: t }); return this; }
  h(t: string) { this.blocks.push({ type: "h", text: t }); return this; }
  p(...runs: Run[]) { this.blocks.push({ type: "p", runs }); return this; }
  li(n: string, ...runs: Run[]) { this.blocks.push({ type: "li", n, runs }); return this; }
  table(rows: { label: string; value: Run[]; strong?: boolean }[]) { this.blocks.push({ type: "table", rows }); return this; }
  sig(lines: string[]) { this.blocks.push({ type: "sig", lines }); return this; }
  note(t: string) { this.blocks.push({ type: "note", text: t }); return this; }
  check(t: string) { if (!this.controlepunten.includes(t)) this.controlepunten.push(t); return { t: "[controleren]", k: "check" as const, src: t }; }
  /** Gegeven met bron; ontbreekt het, dan een expliciete markering en een controlepunt. */
  f(value: string | number | undefined | null, label: string, bron: string): Run {
    if (value === undefined || value === null || value === "") {
      const msg = `Ontbrekend gegeven: ${label}`;
      if (!this.controlepunten.includes(msg)) this.controlepunten.push(msg);
      return { t: `[${label.toUpperCase()} ONTBREEKT]`, k: "missing" };
    }
    if (!this.srcSeen.has(bron)) { this.srcSeen.set(bron, this.srcSeen.size + 1); }
    if (!this.bronnen.some((b) => b.label === label)) this.bronnen.push({ label, bron });
    return { t: String(value), k: "filled", src: bron };
  }
  build(title: string, subtitle?: string, concept = true): DocIR {
    return { title, subtitle, concept, blocks: this.blocks, controlepunten: this.controlepunten, bronnen: this.bronnen };
  }
}

export const runText = (r: Run) => (typeof r === "string" ? r : r.t);
export const blockText = (b: Block): string => {
  switch (b.type) {
    case "p": case "li": return b.runs.map(runText).join("");
    case "table": return b.rows.map((r) => `${r.label}: ${r.value.map(runText).join("")}`).join("\n");
    case "sig": return b.lines.join("\n");
    default: return b.text;
  }
};
