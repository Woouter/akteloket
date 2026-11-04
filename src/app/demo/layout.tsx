import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site/header";
import { isDemo } from "@/lib/config";

export const dynamic = "force-dynamic";

export default function Layout({ children }: { children: React.ReactNode }) {
  if (!isDemo()) notFound();
  return (<><SiteHeader /><main>{children}</main></>);
}
