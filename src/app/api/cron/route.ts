import { NextResponse } from "next/server";
import { runCron } from "@/lib/automation/engine";

/** Periodieke termijnbewaking. Aanroepen met header `authorization: Bearer $CRON_SECRET` (bijv. elk uur). */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Geen toegang" }, { status: 401 });
  if (!secret && process.env.APP_MODE === "production") return NextResponse.json({ error: "CRON_SECRET ontbreekt" }, { status: 500 });
  const res = await runCron();
  return NextResponse.json({ ok: true, ...res });
}
