import { notFound } from "next/navigation";
import { Logo } from "@/components/ui/logo";
import { DemoNav } from "@/components/demo/demo-nav";
import { isDemo } from "@/lib/config";

export const dynamic = "force-dynamic";

/** Demo-pagina's: eigen, rustige kop zonder de websitenavigatie (die is alleen via tours te bekijken). */
export default function Layout({ children }: { children: React.ReactNode }) {
  if (!isDemo()) notFound();
  return (
    <>
      <header className="border-b border-ink-200 bg-white">
        <div className="container-page flex flex-wrap items-center gap-x-6 gap-y-1 pt-3 md:h-16 md:flex-nowrap md:pt-0">
          <div className="flex h-11 items-center gap-6">
            <Logo href="/demo" />
            <span className="hidden h-5 w-px bg-ink-200 sm:block" />
            <span className="hidden text-sm font-medium text-ink-500 sm:block">Demo-omgeving</span>
          </div>
          <DemoNav />
        </div>
      </header>
      <main>{children}</main>
    </>
  );
}
