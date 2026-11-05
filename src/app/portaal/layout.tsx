import { getUser } from "@/lib/auth/session";
import { PortalHeader } from "@/components/portal/shell";

export const dynamic = "force-dynamic";

export default async function PortaalLayout({ children }: { children: React.ReactNode }) {
  // Niet ingelogd: niet hier doorsturen maar de pagina zelf laten doorsturen, zodat
  // `next` het volledige pad bevat (bijv. een stap uit een e-maillink).
  const user = await getUser();
  return (
    <div className="min-h-screen bg-paper">
      {user && <PortalHeader user={user} />}
      {children}
    </div>
  );
}
