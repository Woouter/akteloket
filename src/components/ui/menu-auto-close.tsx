"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Sluit uitklapmenu's (elementen met `data-menu`) na het kiezen van een item, bij een
 * klik ernaast en na elke navigatie. Nodig omdat de layout bij client-side navigatie
 * blijft staan: een open <details> of een menu dat via focus open staat, bleef anders open.
 */
export function MenuAutoClose() {
  const pathname = usePathname();

  useEffect(() => {
    document.querySelectorAll("details[data-menu][open]").forEach((d) => d.removeAttribute("open"));
    const a = document.activeElement;
    if (a instanceof HTMLElement && a.closest("[data-menu]")) a.blur();
  }, [pathname]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const t = e.target instanceof Element ? e.target : null;
      document.querySelectorAll<HTMLDetailsElement>("details[data-menu][open]").forEach((d) => {
        if (!t || !d.contains(t)) d.open = false;
        else if (t.closest("[data-menu-close]")) { e.preventDefault(); d.open = false; }
        else if (!t.closest("summary") && t.closest("a[href], button")) window.setTimeout(() => (d.open = false), 0);
      });
      const menu = t?.closest("[data-menu]:not(details)");
      if (menu && t?.closest("a[href]")) window.setTimeout(() => (document.activeElement as HTMLElement | null)?.blur(), 0);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      document.querySelectorAll<HTMLDetailsElement>("details[data-menu][open]").forEach((d) => {
        d.open = false;
        d.querySelector("summary")?.focus();
      });
      const a = document.activeElement;
      if (a instanceof HTMLElement && a.closest("[data-menu]:not(details)")) a.blur();
    };
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("click", onClick); document.removeEventListener("keydown", onKey); };
  }, []);

  return null;
}
