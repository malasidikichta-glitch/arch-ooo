// POST /api/v2/mark-fulfilled { session_id, fulfilled: bool, tracking?: string }
// Updates a merch order in KV_REDEMPTIONS.
const J = { "Content-Type": "application/json" };

export async function onRequestPost({ request, env }) {
  try {
    const { session_id, fulfilled, tracking } = await request.json();
    if (!session_id) return new Response(JSON.stringify({ error: "missing session_id" }), { status: 400, headers: J });
    const key = "merch:" + session_id;
    const raw = await env.KV_REDEMPTIONS.get(key);
    if (!raw) return new Response(JSON.stringify({ error: "order not found" }), { status: 404, headers: J });
    const order = JSON.parse(raw);
    order.fulfilled = !!fulfilled;
    if (tracking !== undefined) order.tracking = tracking || "";
    order.fulfilled_at = fulfilled ? new Date().toISOString() : null;
    await env.KV_REDEMPTIONS.put(key, JSON.stringify(order));
    return new Response(JSON.stringify({ ok: true, order }), { headers: J });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: J });
  }
}
