import { Glyph, type GlyphName } from "@/components/icons/glyphs";

/**
 * Hero-illustratie: van aanvraag tot gepasseerde akten, in één dossier.
 * De mijlpalen lichten bij het laden na elkaar op; daarna krijgen beide akten hun zegel.
 * Zonder animatie (prefers-reduced-motion) staat alles direct in de eindstand.
 */
const MILESTONES: { glyph: GlyphName; title: string; text: string; when: string }[] = [
  { glyph: "scan", title: "Aanvraag gedaan", text: "Koopovereenkomst geüpload en uitgelezen", when: "2 nov" },
  { glyph: "idcard", title: "Identificatie", text: "Met je telefoon, vanaf de bank", when: "4 nov" },
  { glyph: "video", title: "Volmacht getekend", text: "Korte videoafspraak met het kantoor", when: "9 nov" },
  { glyph: "deed", title: "Akten gecontroleerd", text: "Door de notaris vastgesteld", when: "16 nov" },
  { glyph: "key", title: "Gepasseerd", text: "Je haalt de sleutel op", when: "18 nov" },
];

const STEP = 0.55; // seconden tussen de mijlpalen

export function HeroVisual() {
  const sealDelay = MILESTONES.length * STEP + 0.3;
  return (
    <div className="relative">
      <div className="absolute -inset-6 -z-10 rounded-xl bg-[radial-gradient(ellipse_at_top_right,var(--color-brass-100),transparent_60%)]" />
      <div className="overflow-hidden rounded-lg border border-ink-200 bg-white shadow-lift">
        <div className="flex items-end justify-between gap-4 bg-ink-900 px-5 py-4 text-white">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brass-300">Jouw dossier</p>
            <p className="mt-1 font-serif text-lg font-semibold leading-tight">Bloesemlaan 14, Amersfoort</p>
          </div>
          <p className="shrink-0 text-right text-xs leading-snug text-ink-300">Levering en<br />hypotheek</p>
        </div>

        <ol className="relative px-5 pb-2 pt-5">
          <span aria-hidden className="absolute bottom-7 left-[2.45rem] top-8 w-px bg-ink-200" />
          <span aria-hidden className="hero-rail absolute left-[2.45rem] top-8 w-px origin-top bg-brass-500" style={{ bottom: "1.75rem", animationDuration: `${MILESTONES.length * STEP}s` }} />
          {MILESTONES.map((m, i) => (
            <li key={m.title} className="hero-step relative flex items-start gap-4 pb-4" style={{ animationDelay: `${i * STEP}s` }}>
              <span className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center bg-white">
                <Glyph name={m.glyph} size={30} />
              </span>
              <div className="min-w-0 flex-1 border-b border-ink-100 pb-3">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="font-serif text-[1.02rem] font-semibold text-ink-900">{m.title}</p>
                  <span className="hero-when shrink-0 text-xs tabular text-ink-500" style={{ animationDelay: `${i * STEP + 0.25}s` }}>{m.when}</span>
                </div>
                <p className="text-sm text-ink-600">{m.text}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="grid grid-cols-2 gap-3 border-t border-ink-100 bg-paper px-5 py-4">
          {["Akte van levering", "Hypotheekakte"].map((t, i) => (
            <div key={t} className="relative rounded border border-ink-200 bg-white px-3 pb-3 pt-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-500">{t}</p>
              {[78, 92, 64, 85].map((w, j) => <div key={j} className="mt-1.5 h-[3px] rounded-sm bg-ink-100" style={{ width: `${w}%` }} />)}
              <svg aria-hidden viewBox="0 0 40 40" className="hero-seal absolute -bottom-3 right-2 h-10 w-10" style={{ animationDelay: `${sealDelay + i * 0.2}s` }}>
                <circle cx="20" cy="20" r="18" fill="white" stroke="var(--color-brass-500)" strokeWidth="2" />
                <circle cx="20" cy="20" r="13.5" fill="var(--color-brass-50)" stroke="var(--color-brass-400)" strokeWidth="1" strokeDasharray="1.5 2" />
                <path d="M14 20.5 L18.2 24.5 L26 16" fill="none" stroke="var(--color-brass-700)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
