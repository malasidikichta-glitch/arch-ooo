// Returns all merch orders stored in KV_REDEMPTIONS with "merch:" prefix.
const J = { "Content-Type": "application/json" };

export async function onRequestGet({ env }) {
  try {
    const list = await env.KV_REDEMPTIONS.list({ prefix: "merch:" });
    const orders = [];
    for (const k of list.keys) {
      const raw = await env.KV_REDEMPTIONS.get(k.name);
      try { orders.push(JSON.parse(raw)); } catch {}
    }
    orders.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    const pending = orders.filter(o => !o.fulfilled).length;
    return new Response(JSON.stringify({
      orders, total: orders.length, pending,
    }), { headers: J });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message, orders: [], total: 0, pending: 0 }), { status: 500, headers: J });
  }
}
