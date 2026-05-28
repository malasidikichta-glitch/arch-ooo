import { cookieHeader, J_HEADERS } from "../../../_lib/auth.js";

export async function onRequestPost() {
  const headers = new Headers(J_HEADERS);
  headers.set("Set-Cookie", cookieHeader("", { clear: true }));
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
}

export const onRequestGet = onRequestPost;
