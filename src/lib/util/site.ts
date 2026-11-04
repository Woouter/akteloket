import { BRAND, isDemo } from "@/lib/config";

/** Absolute basis-URL voor links in e-mails. */
export function siteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  if (process.env.NODE_ENV !== "production") return `http://localhost:${process.env.PORT ?? 3000}`;
  return isDemo() ? BRAND.demoUrl : BRAND.url;
}
