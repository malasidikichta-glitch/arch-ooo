const J = { "Content-Type": "application/json" };

export async function onRequestGet({ env }) {
  const list = await env.KV_MESSAGES.list();
  const messages = [];
  for (const k of list.keys) {
    const raw = await env.KV_MESSAGES.get(k.name);
    try { messages.push(JSON.parse(raw)); }
    catch { messages.push({ message: raw, date: new Date(0).toISOString() }); }
  }
  messages.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  return new Response(JSON.stringify({ messages, total: messages.length }), { headers: J });
}

export async function onRequestPost({ request, env }) {
  try {
    const { message } = await request.json();
    const trimmed = (message || "").trim();
    if (!trimmed) return new Response(JSON.stringify({ error: "empty message" }), { status: 400, headers: J });
    if (trimmed.length > 2000) return new Response(JSON.stringify({ error: "too long" }), { status: 400, headers: J });
    const key = Date.now().toString() + "-" + Math.random().toString(36).slice(2, 8);
    await env.KV_MESSAGES.put(key, JSON.stringify({ message: trimmed, date: new Date().toISOString() }));
    return new Response(JSON.stringify({ ok: true }), { headers: J });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: J });
  }
}
