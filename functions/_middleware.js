// Edge middleware:
//  1. Auth gate — blocks /cca_ilkhom, /arch_admin_sam, /55asky, /breakeven, /data,
//     /stats and /label/* sub-paths for unauthenticated requests. Redirects to
//     /label with a ?from= for post-login bounce.
//  2. CORS — permissive headers added to API responses.
//
// /api/v2/auth/* and /label root stay public. Login + logout + me endpoints are
// always allowed so the login flow can complete.

import {
  COOKIE_NAME,
  isProtectedPath,
  parseCookie,
  verifySession,
} from "./_lib/auth.js";

async function gateRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);
  const path = url.pathname;

  // Always allow auth endpoints (login/logout/me)
  if (path.startsWith("/api/v2/auth/")) return next();

  if (!isProtectedPath(path)) return next();

  const cookie = parseCookie(request.headers.get("Cookie"))[COOKIE_NAME];
  const session = cookie && env.AUTH_SECRET
    ? await verifySession(cookie, env.AUTH_SECRET)
    : null;

  if (session) return next();

  const dest = new URL("/label", url.origin);
  dest.searchParams.set("from", path + url.search);
  return Response.redirect(dest.toString(), 302);
}

export async function onRequest(context) {
  const res = await gateRequest(context);
  // Add CORS headers only for /api/* responses
  const url = new URL(context.request.url);
  if (url.pathname.startsWith("/api/")) {
    const out = new Response(res.body, res);
    out.headers.set("Access-Control-Allow-Origin", "*");
    out.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    out.headers.set("Access-Control-Allow-Headers", "Content-Type");
    return out;
  }
  return res;
}
