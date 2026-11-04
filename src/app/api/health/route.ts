export function GET() {
  return Response.json({ ok: true, mode: process.env.APP_MODE ?? "demo", time: new Date().toISOString() });
}
