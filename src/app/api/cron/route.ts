import { NextResponse } from "next/server";
import { runCron } from "@/lib/automation/engine";
import { purgeInbox } from "@/lib/integrations/inbox";

export const maxDuration = 300;

/**
 * Periodieke termijnbewaking, herinneringen en opruimen van de upload-inbox.
 * Vercel Cron roept dit dagelijks aan (zie vercel.json) en stuurt automatisch
 * `authorization: Bearer $CRON_SECRET` mee als die variabele is ingesteld.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Geen toegang" }, { status: 401 });
  if (!secret && process.env.APP_MODE === "production") return NextResponse.json({ error: "CRON_SECRET ontbreekt" }, { status: 500 });
  const res = await runCron();
  const inbox = await purgeInbox().catch(() => 0);
  return NextResponse.json({ ok: true, ...res, inboxOpgeruimd: inbox });
}
