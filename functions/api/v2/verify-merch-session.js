// Verifies a merch Stripe session + stores the order in KV for the /data dashboard.
const J = { "Content-Type": "application/json" };

export async function onRequestPost({ request, env }) {
  try {
    const { session_id } = await request.json();
    if (!session_id) return new Response(JSON.stringify({ error: "missing session_id" }), { status: 400, headers: J });

    const r = await fetch("https://api.stripe.com/v1/checkout/sessions/" + encodeURIComponent(session_id) + "?expand[]=shipping_details", {
      headers: { Authorization: "Bearer " + env.STRIPE_SECRET_KEY },
    });
    const session = await r.json();
    if (session.error) throw new Error(session.error.message);
    if (session.payment_status !== "paid") {
      return new Response(JSON.stringify({ error: "payment not completed" }), { status: 402, headers: J });
    }

    const product = session.metadata?.product || "arch-tee";
    const size = session.metadata?.size || "";
    const email = session.customer_details?.email || session.customer_email || "";
    const name = session.customer_details?.name || "";
    const phone = session.customer_details?.phone || "";
    const ship = session.shipping_details?.address || session.customer_details?.address || {};
    const amount = session.amount_total || 0;

    // store in KV_REDEMPTIONS with a "merch:" prefix — reuse same store for simplicity,
    // but we'll filter by prefix in /data dashboard.
    const orderKey = "merch:" + session_id;
    // Only write once (idempotent on refresh)
    const existing = await env.KV_REDEMPTIONS.get(orderKey);
    if (!existing) {
      await env.KV_REDEMPTIONS.put(orderKey, JSON.stringify({
        session_id, kind: "merch", product, size, email, name, phone,
        ship: {
          line1: ship.line1 || "", line2: ship.line2 || "",
          city: ship.city || "", postal_code: ship.postal_code || "",
          state: ship.state || "", country: ship.country || "",
        },
        amount,
        date: new Date(session.created * 1000).toISOString(),
        fulfilled: false,
      }));
    }

    return new Response(JSON.stringify({ ok: true, product, size, email }), { headers: J });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: J });
  }
}
