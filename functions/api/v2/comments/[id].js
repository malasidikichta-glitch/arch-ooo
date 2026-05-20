// Admin: soft-delete a comment by id. Requires admin password.
const J = { "Content-Type": "application/json" };
const ADMIN_PW = "j'aimelesdatas";

export async function onRequestDelete({ request, params, env }) {
  try {
    const body = await request.json().catch(() => ({}));
    if (body.pw !== ADMIN_PW) {
      return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: J });
    }
    // find by scanning (id is inside the value, but we encoded ts in the key for sort order)
    const list = await env.KV_COMMENTS.list();
    for (const k of list.keys) {
      const raw = await env.KV_COMMENTS.get(k.name);
      try {
        const c = JSON.parse(raw);
        if (c.id === params.id) {
          c.deleted = true;
          c.deleted_at = new Date().toISOString();
          await env.KV_COMMENTS.put(k.name, JSON.stringify(c));
          return new Response(JSON.stringify({ ok: true }), { headers: J });
        }
      } catch {}
    }
    return new Response(JSON.stringify({ error: "not found" }), { status: 404, headers: J });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: J });
  }
}
