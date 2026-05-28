// Single event: GET / PUT / DELETE. PUT and DELETE require a /label session.
import { requireAuth } from "../../../_lib/auth.js";
const J = { "Content-Type": "application/json" };

export async function onRequestGet({ params, env }) {
  const raw = await env.KV_EVENTS.get("event:" + params.id);
  if (!raw) return new Response(JSON.stringify({ error: "not found" }), { status: 404, headers: J });
  return new Response(raw, { headers: J });
}

export async function onRequestPut({ request, params, env }) {
  try {
    if (!await requireAuth(request, env)) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: J });
    const body = await request.json();

    const key = "event:" + params.id;
    const raw = await env.KV_EVENTS.get(key);
    if (!raw) return new Response(JSON.stringify({ error: "not found" }), { status: 404, headers: J });
    const current = JSON.parse(raw);
    const patch = { ...current };
    ["title","date","venue","city","ticket_url","note","hidden"].forEach(f => {
      if (f in body) patch[f] = body[f];
    });
    if ("lineup" in body) {
      patch.lineup = Array.isArray(body.lineup) ? body.lineup : (body.lineup || "").split(",").map(s => s.trim()).filter(Boolean);
    }
    patch.updated_at = new Date().toISOString();
    await env.KV_EVENTS.put(key, JSON.stringify(patch));
    return new Response(JSON.stringify({ ok: true, event: patch }), { headers: J });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: J });
  }
}

export async function onRequestDelete({ request, params, env }) {
  try {
    if (!await requireAuth(request, env)) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: J });
    await env.KV_EVENTS.delete("event:" + params.id);
    return new Response(JSON.stringify({ ok: true }), { headers: J });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: J });
  }
}
