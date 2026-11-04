import { requireUser } from "@/lib/auth/session";
import { PortalHeader } from "@/components/portal/shell";

export const dynamic = "force-dynamic";

export default async function PortaalLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser(undefined, "/portaal");
  return (
    <div className="min-h-screen bg-paper">
      <PortalHeader user={user} />
      {children}
    </div>
  );
}
