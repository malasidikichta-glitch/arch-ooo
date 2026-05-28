// Shared auth helpers. Server-side only — never reach the client.

export const COOKIE_NAME = "arch_session";
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days
export const PROTECTED_PATHS = [
  "/cca_ilkhom",
  "/arch_admin_sam",
  "/55asky",
  "/breakeven",
  "/data",
  "/stats",
];

export function parseCookie(header) {
  const out = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k) out[k] = decodeURIComponent(v.join("="));
  }
  return out;
}

function b64url(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmacSha256(secret, data) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return b64url(sig);
}

// Session token: <id>.<exp>.<hmac(id.exp)>
export async function signSession(id, secret, ttlSec = COOKIE_MAX_AGE) {
  const exp = Math.floor(Date.now() / 1000) + ttlSec;
  const payload = `${id}.${exp}`;
  const sig = await hmacSha256(secret, payload);
  return `${payload}.${sig}`;
}

export async function verifySession(token, secret) {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [id, expStr, sig] = parts;
  const exp = parseInt(expStr, 10);
  if (!exp || exp < Math.floor(Date.now() / 1000)) return null;
  const expected = await hmacSha256(secret, `${id}.${exp}`);
  // constant-time-ish compare
  if (sig.length !== expected.length) return null;
  let diff = 0;
  for (let i = 0; i < sig.length; i++) diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
  if (diff !== 0) return null;
  return { id, exp };
}

export function getUsers(env) {
  try {
    const raw = env.AUTH_USERS;
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (e) {
    return {};
  }
}

export function cookieHeader(token, { maxAge = COOKIE_MAX_AGE, clear = false } = {}) {
  const parts = [
    `${COOKIE_NAME}=${clear ? "" : token}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    `Max-Age=${clear ? 0 : maxAge}`,
  ];
  return parts.join("; ");
}

export function isProtectedPath(pathname) {
  // /label root is the login page (public). Sub-paths require auth.
  if (pathname === "/label" || pathname === "/label/" || pathname === "/label/index.html") {
    return false;
  }
  if (pathname.startsWith("/label/")) return true;

  // Other protected paths
  for (const p of PROTECTED_PATHS) {
    if (pathname === p || pathname === p + "/" || pathname === p + ".html") return true;
    if (pathname.startsWith(p + "/")) return true;
  }
  return false;
}

export const J_HEADERS = { "Content-Type": "application/json" };

// Helper for admin API endpoints: returns the session or null. Use:
//   const session = await requireAuth(request, env);
//   if (!session) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: J_HEADERS });
export async function requireAuth(request, env) {
  if (!env.AUTH_SECRET) return null;
  const cookie = parseCookie(request.headers.get("Cookie"))[COOKIE_NAME];
  if (!cookie) return null;
  return await verifySession(cookie, env.AUTH_SECRET);
}
