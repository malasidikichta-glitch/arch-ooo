// Events CRUD (list + create). See also ./events/[id].js for update/delete.
const J = { "Content-Type": "application/json" };
const ADMIN_PW = "j'aimelesdatas";

function slug(s) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export async function onRequestGet({ env, request }) {
  const url = new URL(request.url);
  const showHidden = url.searchParams.get("all") === "1";
  const list = await env.KV_EVENTS.list();
  const events = [];
  for (const k of list.keys) {
    try {
      const d = JSON.parse(await env.KV_EVENTS.get(k.name));
      if (d.hidden && !showHidden) continue;
      events.push(d);
    } catch {}
  }
  events.sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  return new Response(JSON.stringify({ events, total: events.length }), { headers: J });
}

export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json();
    if (body.pw !== ADMIN_PW) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: J });

    const id = body.id || slug(body.title || "") + "-" + Math.random().toString(36).slice(2, 6);
    const existing = await env.KV_EVENTS.get("event:" + id);
    if (existing) return new Response(JSON.stringify({ error: "id exists" }), { status: 409, headers: J });

    const evt = {
      id,
      title: body.title || "",
      date: body.date || "",        // ISO string
      venue: body.venue || "",
      city: body.city || "",
      lineup: Array.isArray(body.lineup) ? body.lineup : (body.lineup || "").split(",").map(s => s.trim()).filter(Boolean),
      ticket_url: body.ticket_url || "",
      note: body.note || "",
      hidden: !!body.hidden,
      created_at: new Date().toISOString(),
    };
    await env.KV_EVENTS.put("event:" + id, JSON.stringify(evt));
    return new Response(JSON.stringify({ ok: true, event: evt }), { headers: J });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: J });
  }
}
