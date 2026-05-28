import {
  COOKIE_MAX_AGE,
  cookieHeader,
  getUsers,
  J_HEADERS,
  signSession,
} from "../../../_lib/auth.js";

export async function onRequestPost({ request, env }) {
  if (!env.AUTH_SECRET || !env.AUTH_USERS) {
    return new Response(
      JSON.stringify({ ok: false, error: "auth not configured" }),
      { status: 500, headers: J_HEADERS }
    );
  }
  let id = "", password = "";
  try {
    const body = await request.json();
    id = (body.id || "").trim().toLowerCase();
    password = body.password || "";
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: "bad request" }), {
      status: 400, headers: J_HEADERS,
    });
  }
  if (!id || !password) {
    return new Response(JSON.stringify({ ok: false, error: "missing fields" }), {
      status: 400, headers: J_HEADERS,
    });
  }
  const users = getUsers(env);
  const u = users[id];
  if (!u || u.password !== password) {
    return new Response(JSON.stringify({ ok: false, error: "identifiants invalides" }), {
      status: 401, headers: J_HEADERS,
    });
  }
  const token = await signSession(id, env.AUTH_SECRET, COOKIE_MAX_AGE);
  const headers = new Headers(J_HEADERS);
  headers.set("Set-Cookie", cookieHeader(token));
  return new Response(
    JSON.stringify({ ok: true, id, display: u.display || id, role: u.role || "user" }),
    { status: 200, headers }
  );
}
