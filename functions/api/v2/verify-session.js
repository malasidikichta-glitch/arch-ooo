// Verifies a Stripe Checkout Session OR a promo redemption.
// Frontend (success.html) expects: { valid: true, product_ids: [...] }
// Also returns { downloads: [...] } for richer clients (success2.html, /shop/success).
import { downloadsFor, LINKS } from "../../_lib/plugin-links.js";
const J = { "Content-Type": "application/json" };

const BUNDLE_PRODUCTS = Object.keys(LINKS);  // 11 plugins

function expandProductIds(rawIds) {
  const out = new Set();
  for (const id of rawIds) {
    if (id === "bundle" || id === "archbundle") {
      for (const p of BUNDLE_PRODUCTS) out.add(p);
    } else if (LINKS[id]) {
      out.add(id);
    } else {
      // Pass through unknown ids (e.g. void/vrb) so the frontend bundle expansion can handle them
      out.add(id);
    }
  }
  return [...out];
}

export async function onRequestPost({ request, env }) {
  try {
    const { session_id } = await request.json();
    if (!session_id) {
      return new Response(JSON.stringify({ valid: false, error: "missing session_id" }), { status: 400, headers: J });
    }

    // Promo session (no Stripe)
    if (session_id.startsWith("promo_")) {
      const list = await env.KV_REDEMPTIONS.list();
      for (const k of list.keys) {
        if (k.name.endsWith(":" + session_id)) {
          const raw = await env.KV_REDEMPTIONS.get(k.name);
          const d = JSON.parse(raw);
          const product_ids = expandProductIds(d.products || []);
          return new Response(JSON.stringify({
            valid: true,
            is_promo: true,
            code: d.code,
            session_id,
            product_ids,
            // legacy/rich format
            products: d.products || [],
            downloads: downloadsFor(d.products || []),
          }), { headers: J });
        }
      }
      return new Response(JSON.stringify({ valid: false, error: "invalid promo session" }), { status: 404, headers: J });
    }

    // Stripe session
    const r = await fetch("https://api.stripe.com/v1/checkout/sessions/" + encodeURIComponent(session_id), {
      headers: { Authorization: "Bearer " + env.STRIPE_SECRET_KEY },
    });
    const session = await r.json();
    if (session.error) throw new Error(session.error.message);
    if (session.payment_status !== "paid") {
      return new Response(JSON.stringify({ valid: false, error: "payment not completed" }), { status: 402, headers: J });
    }
    const rawIds = (session.metadata?.products || "").split(",").map(s => s.trim()).filter(Boolean);
    const product_ids = expandProductIds(rawIds);
    return new Response(JSON.stringify({
      valid: true,
      is_promo: false,
      session_id,
      product_ids,
      // legacy/rich format
      products: rawIds,
      downloads: downloadsFor(rawIds),
    }), { headers: J });
  } catch (err) {
    return new Response(JSON.stringify({ valid: false, error: err.message }), { status: 500, headers: J });
  }
}
