const J = { "Content-Type": "application/json" };

export async function onRequestGet({ env }) {
  const list = await env.KV_EMAILS.list();
  const emails = [];
  for (const k of list.keys) {
    const raw = await env.KV_EMAILS.get(k.name);
    try { emails.push(JSON.parse(raw)); }
    catch { emails.push({ email: k.name, date: new Date(0).toISOString() }); }
  }
  emails.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  return new Response(JSON.stringify({ emails, total: emails.length }), { headers: J });
}

export async function onRequestPost({ request, env }) {
  try {
    const { email } = await request.json();
    if (!email || !email.includes("@")) {
      return new Response(JSON.stringify({ error: "invalid email" }), { status: 400, headers: J });
    }
    const key = email.toLowerCase().trim();
    const existing = await env.KV_EMAILS.get(key);
    if (!existing) {
      await env.KV_EMAILS.put(key, JSON.stringify({ email: key, date: new Date().toISOString() }));
    }
    return new Response(JSON.stringify({ ok: true }), { headers: J });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: J });
  }
}
