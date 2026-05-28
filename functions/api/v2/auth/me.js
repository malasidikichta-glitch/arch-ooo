import {
  COOKIE_NAME,
  getUsers,
  J_HEADERS,
  parseCookie,
  verifySession,
} from "../../../_lib/auth.js";

export async function onRequestGet({ request, env }) {
  const cookie = parseCookie(request.headers.get("Cookie"))[COOKIE_NAME];
  if (!cookie || !env.AUTH_SECRET) {
    return new Response(JSON.stringify({ authenticated: false }), {
      status: 401, headers: J_HEADERS,
    });
  }
  const session = await verifySession(cookie, env.AUTH_SECRET);
  if (!session) {
    return new Response(JSON.stringify({ authenticated: false }), {
      status: 401, headers: J_HEADERS,
    });
  }
  const users = getUsers(env);
  const u = users[session.id] || {};
  return new Response(
    JSON.stringify({
      authenticated: true,
      id: session.id,
      display: u.display || session.id,
      role: u.role || "user",
    }),
    { status: 200, headers: J_HEADERS }
  );
}
