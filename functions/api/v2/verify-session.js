import { downloadsFor } from "../../_lib/drive-links.js";
const J = { "Content-Type": "application/json" };

export async function onRequestPost({ request, env }) {
  try {
    const { session_id } = await request.json();
    if (!session_id) return new Response(JSON.stringify({ error: "missing session_id" }), { status: 400, headers: J });

    // Promo session (no Stripe)
    if (session_id.startsWith("promo_")) {
      const list = await env.KV_REDEMPTIONS.list();
      for (const k of list.keys) {
        if (k.name.endsWith(":" + session_id)) {
          const raw = await env.KV_REDEMPTIONS.get(k.name);
          const d = JSON.parse(raw);
          return new Response(JSON.stringify({
            is_promo: true, code: d.code, downloads: downloadsFor(d.products),
          }), { headers: J });
        }
      }
      return new Response(JSON.stringify({ error: "invalid promo session" }), { status: 404, headers: J });
    }

    // Stripe session
    const r = await fetch("https://api.stripe.com/v1/checkout/sessions/" + encodeURIComponent(session_id), {
      headers: { Authorization: "Bearer " + env.STRIPE_SECRET_KEY },
    });
    const session = await r.json();
    if (session.error) throw new Error(session.error.message);
    if (session.payment_status !== "paid") {
      return new Response(JSON.stringify({ error: "payment not completed" }), { status: 402, headers: J });
    }
    const products = (session.metadata?.products || "").split(",").filter(Boolean);
    return new Response(JSON.stringify({
      is_promo: false, downloads: downloadsFor(products),
    }), { headers: J });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: J });
  }
}
