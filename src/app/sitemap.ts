import type { MetadataRoute } from "next";
import { BRAND } from "@/lib/config";
import { allArticles } from "@/lib/content/kennisbank";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ["", "/levering-en-hypotheekakte", "/akte-van-levering", "/hypotheekakte", "/koopovereenkomst-opstellen", "/hoe-werkt-het", "/tarieven", "/veelgestelde-vragen", "/kennisbank", "/voor-makelaars-en-adviseurs", "/over-ons", "/contact", "/veiligheid", "/privacy", "/voorwaarden", "/dienstverleningsovereenkomst"];
  const now = new Date();
  return [
    ...pages.map((p) => ({ url: `${BRAND.url}${p}`, lastModified: now, changeFrequency: "weekly" as const, priority: p === "" ? 1 : p.split("/").length === 2 ? 0.8 : 0.5 })),
    ...allArticles().map((a) => ({ url: `${BRAND.url}/kennisbank/${a.slug}`, lastModified: new Date(a.updated), changeFrequency: "monthly" as const, priority: 0.6 })),
  ];
}
