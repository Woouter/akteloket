import type { MetadataRoute } from "next";
import { BRAND, isDemo } from "@/lib/config";

export default function robots(): MetadataRoute.Robots {
  if (isDemo()) return { rules: [{ userAgent: "*", disallow: "/" }] };
  return { rules: [{ userAgent: "*", allow: "/", disallow: ["/portaal", "/notaris", "/beheer", "/aanvraag", "/api", "/inloggen", "/uitnodiging", "/demo"] }], sitemap: `${BRAND.url}/sitemap.xml` };
}
