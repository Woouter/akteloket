import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  // Alleen voor lokaal naast elkaar draaien van demo- en productiebuild (standaard .next).
  distDir: process.env.NEXT_DIST_DIR || ".next",
  serverExternalPackages: ["@electric-sql/pglite", "pg", "nodemailer", "unpdf"],
  // Migraties en kennisbank worden op runtime gelezen (ook op Vercel).
  outputFileTracingIncludes: { "/**": ["./drizzle/**/*", "./content/**/*"] },
  experimental: {
    serverActions: { bodySizeLimit: "25mb" },
  },
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
