"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth/guards";
import { runAutomations, runCron } from "@/lib/automation/engine";
import { logEvent } from "@/lib/domain/dossier";

export async function runForDossier(dossierId: string) {
  const { user } = await requireStaff(dossierId);
  await logEvent({ dossierId, actorType: "beheer", actor: user, type: "automation.handmatig", message: "Automatisering handmatig opnieuw gestart door platformbeheer." });
  await runAutomations(dossierId, "beheer");
  revalidatePath(`/beheer/dossiers/${dossierId}`);
  redirect(`/beheer/dossiers/${dossierId}`);
}

export async function runCronAction() {
  await requireStaff();
  await runCron();
  revalidatePath("/beheer", "layout");
  redirect("/beheer/automatisering?gedraaid=1");
}

/** E-mailadres afmelden: het platform stuurt dan geen e-mail meer naar dit adres. */
export async function afmeldenAction(fd: FormData) {
  await requireStaff();
  const { afmelden } = await import("@/lib/integrations/afmeldingen");
  const email = String(fd.get("email") ?? "").trim();
  if (!email.includes("@")) redirect("/beheer/emails?fout=adres");
  await afmelden(email, "beheer", String(fd.get("reden") ?? ""));
  revalidatePath("/beheer/emails");
  redirect(`/beheer/emails?afgemeld=${encodeURIComponent(email.toLowerCase())}`);
}

export async function weerAanmeldenAction(email: string) {
  await requireStaff();
  const { weerAanmelden } = await import("@/lib/integrations/afmeldingen");
  await weerAanmelden(email);
  revalidatePath("/beheer/emails");
  redirect("/beheer/emails");
}
