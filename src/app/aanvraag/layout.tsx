import { Lock, Phone } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { BRAND } from "@/lib/config";

export default function AanvraagLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-ink-100 bg-white">
        <div className="container-page flex h-16 items-center justify-between">
          <Logo />
          <div className="flex items-center gap-5 text-sm text-ink-600">
            <span className="hidden items-center gap-1.5 sm:flex"><Lock className="h-4 w-4 text-ok-600" />Beveiligde verbinding</span>
            <a href={BRAND.phoneHref} className="flex items-center gap-1.5 font-medium hover:text-ink-900"><Phone className="h-4 w-4" /><span className="hidden sm:inline">Hulp nodig?</span> {BRAND.phone}</a>
          </div>
        </div>
      </header>
      <main className="container-page max-w-5xl py-10 sm:py-14">{children}</main>
    </div>
  );
}
