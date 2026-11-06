import type { ReactNode } from "react";
import { cn } from "@/lib/util/format";

/**
 * Eigen iconenset van Akteloket ("glyphs").
 *
 * Stijl: een lijntekening in de tekstkleur met daarachter een iets verschoven,
 * messingkleurig vlak, zoals bij een drukwerk met een lichte passerverschuiving.
 * Motieven komen uit het notariaat: akte met zegel, stempel, sleutel, kadasterkaart.
 * Bewust zonder tegel of cirkel eromheen.
 *
 * - `l`: lijnen (stroke, currentColor)
 * - `a`: accentvlak dat verschoven achter de lijnen ligt
 * - `s`: accent dat niet verschuift (zegel, scanbalk, stempelafdruk)
 */
type GlyphDef = { l: ReactNode; a?: ReactNode; s?: ReactNode };

function gearPath(cx: number, cy: number, rOut: number, rIn: number, teeth: number): string {
  const pts: string[] = [];
  const step = (Math.PI * 2) / teeth;
  for (let i = 0; i < teeth; i++) {
    const a = i * step - Math.PI / 2;
    const w = step * 0.22;
    const p = (r: number, ang: number) => `${(cx + r * Math.cos(ang)).toFixed(2)} ${(cy + r * Math.sin(ang)).toFixed(2)}`;
    pts.push(p(rIn, a - step / 2 + w), p(rOut, a - w), p(rOut, a + w), p(rIn, a + step / 2 - w));
  }
  return `M${pts.join(" L")} Z`;
}

const G = {
  house: {
    a: <path d="M7 14 L16 6.5 L25 14 Z" />,
    l: <><path d="M5 15 L16 6 L27 15" /><path d="M8 13 V26 H24 V13" /><path d="M14 26 V19.5 H18 V26" /></>,
  },
  key: {
    a: <circle cx="10" cy="16" r="5" />,
    l: <><circle cx="10" cy="16" r="5" /><circle cx="10" cy="16" r="1.4" /><path d="M15 16 H27" /><path d="M23 16 V20" /><path d="M26.5 16 V19" /></>,
  },
  deed: {
    s: <><circle cx="21.5" cy="23.5" r="4" /></>,
    l: <><path d="M8 4 H20 L25 9 V19" /><path d="M8 4 V28 H17" /><path d="M20 4 V9 H25" /><path d="M11 13 H21" /><path d="M11 17 H18" /><circle cx="21.5" cy="23.5" r="4" /><path d="M19.6 27 L18.6 30" /><path d="M23.4 27 L24.4 30" /></>,
  },
  bank: {
    a: <path d="M5 12 L16 5.5 L27 12 Z" />,
    l: <><path d="M4.5 12 L16 5 L27.5 12 Z" /><path d="M8 15 V23" /><path d="M13 15 V23" /><path d="M19 15 V23" /><path d="M24 15 V23" /><path d="M6 26 H26" /><path d="M4.5 28 H27.5" /></>,
  },
  scales: {
    a: <><path d="M4.5 18 Q8 23 11.5 18 Z" /><path d="M20.5 18 Q24 23 27.5 18 Z" /></>,
    l: <><path d="M16 6.5 V27" /><path d="M10.5 27 H21.5" /><path d="M6 9 H26" /><circle cx="16" cy="5.5" r="1.2" /><path d="M8 9 L4.5 18" /><path d="M8 9 L11.5 18" /><path d="M24 9 L20.5 18" /><path d="M24 9 L27.5 18" /><path d="M4.5 18 Q8 22.5 11.5 18" /><path d="M20.5 18 Q24 22.5 27.5 18" /></>,
  },
  video: {
    a: <rect x="4" y="7" width="24" height="16" rx="1.5" />,
    l: <><rect x="4" y="7" width="24" height="16" rx="1.5" /><path d="M12.5 27 H19.5" /><path d="M16 23 V27" /><circle cx="16" cy="13" r="2.7" /><path d="M10.8 21 Q16 15.6 21.2 21" /></>,
  },
  scan: {
    s: <rect x="4.5" y="15.5" width="23" height="2.6" rx="0.6" />,
    l: <><path d="M7 4 H19 L24 9 V28 H7 Z" /><path d="M19 4 V9 H24" /><path d="M10 12 H20" /><path d="M10 21.5 H20" /><path d="M10 25 H16" /></>,
  },
  route: {
    s: <circle cx="25" cy="6.5" r="3" />,
    l: <><path d="M7 25 C7 19, 16 20, 16 14.5 S25 11, 25 9.5" strokeDasharray="0.1 3.2" /><circle cx="7" cy="25" r="2.2" /><circle cx="16" cy="14.5" r="2.2" /><circle cx="25" cy="6.5" r="3" /></>,
  },
  euro: {
    a: <circle cx="16" cy="16" r="10.5" />,
    l: <><circle cx="16" cy="16" r="10.5" /><path d="M20.2 11.6 A6 6 0 1 0 20.2 20.4" /><path d="M9.6 14.6 H17" /><path d="M9.6 17.4 H17" /></>,
  },
  book: {
    a: <path d="M16 8 C12 6, 7.5 6, 4 7 V25 C7.5 24, 12 24, 16 26 Z" />,
    l: <><path d="M16 8 C12 6, 7.5 6, 4 7 V25 C7.5 24, 12 24, 16 26" /><path d="M16 8 C20 6, 24.5 6, 28 7 V25 C24.5 24, 20 24, 16 26" /><path d="M16 8 V26" /></>,
  },
  pen: {
    a: <path d="M16 4 L23 14 L19.5 25 H12.5 L9 14 Z" />,
    l: <><path d="M16 4 L23 14 L19.5 25 H12.5 L9 14 Z" /><path d="M16 15.5 V22" /><circle cx="16" cy="13.8" r="1.5" /><path d="M11.5 28.5 H20.5" /></>,
  },
  shield: {
    a: <path d="M16 4 L6 8 V15 C6 21, 10.5 25.5, 16 28 Z" />,
    l: <><path d="M16 4 L26 8 V15 C26 21, 21.5 25.5, 16 28 C10.5 25.5, 6 21, 6 15 V8 Z" /><path d="M11.5 16 L14.8 19.2 L20.5 12.8" /></>,
  },
  lock: {
    a: <rect x="7" y="14" width="18" height="13" rx="1.5" />,
    l: <><rect x="7" y="14" width="18" height="13" rx="1.5" /><path d="M11 14 V10 A5 5 0 0 1 21 10 V14" /><circle cx="16" cy="19.5" r="1.5" /><path d="M16 21 V23.5" /></>,
  },
  person: {
    a: <path d="M7 27 C7 20.5, 11 18, 16 18 C21 18, 25 20.5, 25 27 Z" />,
    l: <><circle cx="16" cy="11" r="4.5" /><path d="M7 27 C7 20.5, 11 18, 16 18 C21 18, 25 20.5, 25 27" /></>,
  },
  pair: {
    a: <path d="M14.5 26 C14.5 21, 17.5 19, 21 19 C25 19, 28 21, 28 26 Z" />,
    l: <><circle cx="11" cy="11" r="3.6" /><circle cx="21" cy="12.5" r="3.4" /><path d="M4 26 C4 20.5, 7 18, 11 18 C13.6 18, 15.5 19, 16.6 20.6" /><path d="M14.5 26 C14.5 21, 17.5 19, 21 19 C25 19, 28 21, 28 26" /></>,
  },
  cog: {
    a: <circle cx="16" cy="16" r="7.5" />,
    l: <><path d={gearPath(16, 16, 11, 8.2, 8)} /><circle cx="16" cy="16" r="3.4" /></>,
  },
  calendar: {
    a: <rect x="5" y="7" width="22" height="5.5" rx="1" />,
    l: <><rect x="5" y="7" width="22" height="20" rx="1.5" /><path d="M5 12.5 H27" /><path d="M11 4.5 V9" /><path d="M21 4.5 V9" /><path d="M11.5 19.5 L14.5 22.5 L20.5 16.5" /></>,
  },
  mail: {
    s: <circle cx="16" cy="18" r="3.2" />,
    l: <><rect x="4" y="8" width="24" height="16" rx="1.5" /><path d="M4.6 9 L13.4 16" /><path d="M27.4 9 L18.6 16" /></>,
  },
  parcel: {
    a: <path d="M13 6 L20 9 V26 L13 23 Z" />,
    l: <><path d="M5 9 L13 6 L20 9 L27 6 V23 L20 26 L13 23 L5 26 Z" /><path d="M13 6 V23" /><path d="M20 9 V26" /></>,
  },
  idcard: {
    a: <rect x="7" y="12" width="7" height="8" rx="1" />,
    l: <><rect x="4" y="8" width="24" height="16" rx="1.5" /><rect x="7" y="12" width="7" height="8" rx="1" /><path d="M17 13 H24" /><path d="M17 16.5 H24" /><path d="M17 20 H21.5" /></>,
  },
  clipboard: {
    s: <rect x="12" y="4" width="8" height="4" rx="1" />,
    l: <><rect x="7" y="6" width="18" height="22" rx="1.5" /><rect x="12" y="4" width="8" height="4" rx="1" /><path d="M10.5 14 L12 15.5 L14.5 13" /><path d="M17 14.5 H22" /><path d="M10.5 20.5 L12 22 L14.5 19.5" /><path d="M17 21 H22" /></>,
  },
  pin: {
    s: <circle cx="16" cy="12.5" r="3" />,
    l: <><path d="M16 28 C16 28, 25 19.5, 25 12.5 A9 9 0 0 0 7 12.5 C7 19.5, 16 28, 16 28 Z" /><circle cx="16" cy="12.5" r="3" /></>,
  },
  loupe: {
    a: <circle cx="13" cy="13" r="7.5" />,
    l: <><circle cx="13" cy="13" r="7.5" /><path d="M18.5 18.5 L27 27" /><path d="M9.5 11.5 H16.5" /><path d="M9.5 14.8 H14" /></>,
  },
  archive: {
    a: <rect x="4" y="6" width="24" height="6" rx="1" />,
    l: <><rect x="4" y="6" width="24" height="6" rx="1" /><path d="M6 12 V26 H26 V12" /><path d="M13 17 H19" /></>,
  },
  phone: {
    a: <rect x="10" y="9" width="12" height="12.5" />,
    l: <><rect x="10" y="4" width="12" height="24" rx="2.5" /><path d="M14.5 7 H17.5" /><circle cx="16" cy="24.6" r="0.8" /></>,
  },
  clock: {
    a: <path d="M16 16 V5 A11 11 0 0 1 27 16 Z" />,
    l: <><circle cx="16" cy="16" r="11" /><path d="M16 9.5 V16 L20.5 18.5" /></>,
  },
  chat: {
    a: <path d="M5 8 H27 V21 H14 L8 26 V21 H5 Z" />,
    l: <><path d="M5 8 H27 V21 H14 L8 26 V21 H5 Z" /><path d="M10 13 H22" /><path d="M10 16.5 H18" /></>,
  },
  signature: {
    s: <circle cx="7" cy="25" r="1.5" />,
    l: <><path d="M10 25 H27" /><path d="M6 19.5 C9 11, 12.5 11.5, 11.2 17.5 C10 23, 15 13, 17 16 C18.5 18.4, 20 17, 22 15 C23.5 13.5, 24.6 16, 26.5 14.8" /></>,
  },
  stamp: {
    s: <rect x="8" y="24" width="16" height="3" rx="0.6" />,
    l: <><path d="M13 5 H19 V10.5 C19 12.8, 22 13.6, 22 16 H10 C10 13.6, 13 12.8, 13 10.5 Z" /><rect x="7" y="16" width="18" height="4" rx="1" /></>,
  },
  stack: {
    a: <path d="M7 24 V5.5 A1.5 1.5 0 0 1 8.5 4 H21 V8 H9 V24 Z" />,
    l: <><path d="M7 23.5 V5.5 A1.5 1.5 0 0 1 8.5 4 H20.5" /><rect x="10" y="8" width="15" height="20" rx="1.5" /><path d="M13.5 14 H21.5" /><path d="M13.5 18 H21.5" /><path d="M13.5 22 H18" /></>,
  },
  flow: {
    s: <rect x="21" y="21" width="7" height="7" rx="1" />,
    l: <><rect x="4" y="4" width="7" height="7" rx="1" /><rect x="21" y="4" width="7" height="7" rx="1" /><rect x="21" y="21" width="7" height="7" rx="1" /><path d="M11 7.5 H21" /><path d="M24.5 11 V21" /><path d="M7.5 11 V20 C7.5 23, 9 24.5, 12 24.5 H21" /></>,
  },
} satisfies Record<string, GlyphDef>;

export type GlyphName = keyof typeof G;
export const GLYPH_NAMES = Object.keys(G) as GlyphName[];

export function Glyph({ name, size = 40, className, tone = "light", title }: { name: GlyphName; size?: number; className?: string; tone?: "light" | "dark"; title?: string }) {
  const g: GlyphDef = G[name];
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} fill="none" className={cn("akte-glyph shrink-0", tone === "dark" ? "akte-glyph-dark" : "", className)} role={title ? "img" : undefined} aria-hidden={title ? undefined : true}>
      {title && <title>{title}</title>}
      {g.a && <g className="akte-glyph-accent" transform="translate(1.7 1.7)">{g.a}</g>}
      {g.s && <g className="akte-glyph-accent">{g.s}</g>}
      <g stroke="currentColor" strokeWidth={1.45} strokeLinecap="round" strokeLinejoin="round">{g.l}</g>
    </svg>
  );
}
