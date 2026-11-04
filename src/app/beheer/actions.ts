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
