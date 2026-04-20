const J = { "Content-Type": "application/json" };

export async function onRequestGet({ env }) {
  try {
    const list = await env.KV_REDEMPTIONS.list();
    const code_counts = {};
    const recent = [];
    for (const k of list.keys) {
      const raw = await env.KV_REDEMPTIONS.get(k.name);
      try {
        const d = JSON.parse(raw);
        code_counts[d.code] = (code_counts[d.code] || 0) + 1;
        recent.push(d);
      } catch {}
    }
    recent.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    return new Response(JSON.stringify({ code_counts, recent, total: recent.length }), { headers: J });
  } catch (err) {
    return new Response(JSON.stringify({
      error: err.message, code_counts: {}, recent: [], total: 0,
    }), { status: 500, headers: J });
  }
}
