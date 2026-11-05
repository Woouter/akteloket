import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import "@fontsource-variable/inter";
import "@fontsource-variable/source-serif-4/opsz.css";
import "@fontsource-variable/jetbrains-mono";
import "./globals.css";
import { BRAND, isDemo } from "@/lib/config";
import { DemoBar } from "@/components/demo/demo-bar";
import { TourProvider } from "@/components/demo/tour";
import { mainDemoDossierId } from "@/lib/demo/main";
import { MenuAutoClose } from "@/components/ui/menu-auto-close";

export const metadata: Metadata = {
  metadataBase: new URL(BRAND.url),
  title: { default: `${BRAND.name} — Online notaris voor je akte van levering en hypotheekakte`, template: `%s | ${BRAND.name}` },
  description: "Regel je akte van levering en hypotheekakte volledig online. Upload je koopovereenkomst, wij doen de rest. Vaste all-in prijs, onafhankelijke notaris, bijna nooit langskomen.",
  applicationName: BRAND.name,
  openGraph: { type: "website", locale: "nl_NL", siteName: BRAND.name },
  robots: isDemo() ? { index: false, follow: false } : { index: true, follow: true },
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = { themeColor: "#0b1f3a", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const demo = isDemo();
  const mainId = demo ? await mainDemoDossierId() : undefined;
  return (
    <html lang="nl" data-scroll-behavior="smooth">
      <body className="min-h-screen antialiased">
        {demo && <DemoBar />}
        {children}
        <Suspense fallback={null}><MenuAutoClose /></Suspense>
        {demo && (
          <Suspense fallback={null}>
            <TourProvider mainId={mainId} />
          </Suspense>
        )}
      </body>
    </html>
  );
}
