import { requireUser } from "@/lib/auth/session";
import { StaffShell } from "@/components/staff/shell";

export const dynamic = "force-dynamic";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const user = await requireUser(["beheer"], "/beheer");
  return <StaffShell user={user} area="beheer">{children}</StaffShell>;
}
