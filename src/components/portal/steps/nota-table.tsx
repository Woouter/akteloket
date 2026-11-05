import type { NotaState } from "@/lib/domain/types";
import { euro } from "@/lib/util/format";

/** Nota van afrekening. `audience="staf"` voor notaris/beheer (geen "jou"-aanspreekvorm). */
export function NotaTable({ nota, side, audience = "partij" }: { nota: NotaState; side: "koper" | "verkoper"; audience?: "partij" | "staf" }) {
  const minus = side === "koper" ? "credit" : "debet";
  const staf = audience === "staf";
  const totaal = side === "koper"
    ? nota.saldo >= 0 ? (staf ? "Door koper te voldoen" : "Door jou te voldoen") : (staf ? "Aan koper uit te keren" : "Aan jou uit te keren")
    : staf ? "Aan verkoper uit te betalen" : "Aan jou uit te betalen";
  return (
    <table className="mt-4 w-full text-sm">
      <tbody className="divide-y divide-ink-100">
        {nota.regels.map((r, i) => (
          <tr key={i}><td className="py-2.5 pr-4 text-ink-700">{r.label}{r.toelichting && <span className="block text-xs text-ink-400">{r.toelichting}</span>}</td><td className={`py-2.5 text-right tabular whitespace-nowrap ${r.richting === minus ? "text-ok-700" : "text-ink-900"}`}>{r.richting === minus ? "− " : ""}{euro(r.bedrag)}</td></tr>
        ))}
        <tr className="border-t-2 border-ink-900"><td className="py-3 font-semibold text-ink-900">{totaal}</td><td className="py-3 text-right font-serif text-lg font-semibold tabular text-ink-900">{euro(Math.abs(nota.saldo))}</td></tr>
      </tbody>
    </table>
  );
}
