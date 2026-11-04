import type { NotaState } from "@/lib/domain/types";
import { euro } from "@/lib/util/format";

export function NotaTable({ nota, side }: { nota: NotaState; side: "koper" | "verkoper" }) {
  const minus = side === "koper" ? "credit" : "debet";
  return (
    <table className="mt-4 w-full text-sm">
      <tbody className="divide-y divide-ink-100">
        {nota.regels.map((r, i) => (
          <tr key={i}><td className="py-2.5 pr-4 text-ink-700">{r.label}{r.toelichting && <span className="block text-xs text-ink-400">{r.toelichting}</span>}</td><td className={`py-2.5 text-right tabular whitespace-nowrap ${r.richting === minus ? "text-ok-700" : "text-ink-900"}`}>{r.richting === minus ? "− " : ""}{euro(r.bedrag)}</td></tr>
        ))}
        <tr className="border-t-2 border-ink-900"><td className="py-3 font-bold text-ink-900">{side === "koper" ? (nota.saldo >= 0 ? "Door jou te voldoen" : "Aan jou uit te keren") : "Aan jou uit te betalen"}</td><td className="py-3 text-right text-lg font-extrabold tabular text-ink-900">{euro(Math.abs(nota.saldo))}</td></tr>
      </tbody>
    </table>
  );
}
