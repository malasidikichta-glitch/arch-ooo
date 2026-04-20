// GET  /api/v2/track-visit → { days: {date:count}, total }
// POST /api/v2/track-visit → increments today's count
const J = { "Content-Type": "application/json" };

export async function onRequestGet({ env }) {
  const list = await env.KV_VISITS.list();
  const days = {};
  for (const k of list.keys) {
    const v = parseInt(await env.KV_VISITS.get(k.name)) || 0;
    days[k.name] = v;
  }
  const total = Object.values(days).reduce((s, v) => s + v, 0);
  return new Response(JSON.stringify({ days, total }), { headers: J });
}

export async function onRequestPost({ env }) {
  const today = new Date().toISOString().slice(0, 10);
  const cur = parseInt((await env.KV_VISITS.get(today)) || "0");
  await env.KV_VISITS.put(today, String(cur + 1));
  return new Response(JSON.stringify({ ok: true, day: today, count: cur + 1 }), { headers: J });
}
