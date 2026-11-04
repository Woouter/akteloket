import "server-only";
import fs from "node:fs";
import path from "node:path";
import { parse } from "yaml";
import { marked } from "marked";

export interface Article {
  slug: string;
  title: string;
  description: string;
  keyword: string;
  category: string;
  readingTime: number;
  updated: string;
  cta: "levering" | "hypotheek" | "beide" | "koopovereenkomst";
  related: string[];
  faq: { q: string; a: string }[];
  body: string;
  html: string;
  headings: { id: string; text: string }[];
}

const DIR = path.join(process.cwd(), "content", "kennisbank");
let cache: Article[] | null = null;

const slugify = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export function allArticles(): Article[] {
  if (cache && process.env.NODE_ENV === "production") return cache;
  const files = fs.readdirSync(DIR).filter((f) => f.endsWith(".md"));
  const list = files.map((f) => {
    const raw = fs.readFileSync(path.join(DIR, f), "utf8");
    const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    const fm = (m ? parse(m[1]) : {}) as Omit<Article, "slug" | "body" | "html" | "headings">;
    const body = m ? m[2].trim() : raw;
    const headings: Article["headings"] = [];
    const renderer = new marked.Renderer();
    renderer.heading = ({ tokens, depth }) => {
      const text = tokens.map((t) => ("text" in t ? t.text : "")).join("");
      const id = slugify(text);
      if (depth === 2) headings.push({ id, text });
      return `<h${depth} id="${id}">${marked.parseInline(text)}</h${depth}>`;
    };
    const html = marked.parse(body, { renderer, async: false }) as string;
    return { slug: f.replace(/\.md$/, ""), ...fm, related: fm.related ?? [], faq: fm.faq ?? [], body, html, headings };
  });
  list.sort((a, b) => a.title.localeCompare(b.title, "nl"));
  cache = list;
  return list;
}

export function getArticle(slug: string): Article | undefined {
  return allArticles().find((a) => a.slug === slug);
}

export const CATEGORY_ORDER = ["Notaris & akten", "Kopen", "Hypotheek", "Kosten & belasting", "Verkopen"];
