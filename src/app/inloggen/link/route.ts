import { NextResponse } from "next/server";
import { consumeLoginToken, createSession } from "@/lib/auth/session";
import { safePath } from "@/lib/util/site";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const t = url.searchParams.get("token");
  const res = t ? await consumeLoginToken(t) : null;
  if (!res) return NextResponse.redirect(new URL("/inloggen?fout=verlopen", req.url));
  await createSession(res.user.id);
  const dest = safePath(res.redirectTo, res.user.role === "notaris" ? "/notaris" : res.user.role === "beheer" ? "/beheer" : "/portaal");
  return NextResponse.redirect(new URL(dest, req.url));
}
