// Stripe checkout for plugin cart.
// Accepts both legacy {products: ["shard"]} and new {items: [{id:"shard"}]} formats.
// Supports discount codes for bundle (DISCOUNT_CODES below).
const J = { "Content-Type": "application/json" };

const PRICING = {
  shard: 2000, keys: 2000, grain: 2000,
  fmnt: 1000, cmpr: 1000, eqls: 1000, dist: 1000,
  sprd: 1000, clpr: 1000, dly: 1000, dck: 1000,
  void: 1000, vrb: 1000,
};
const ALL_IDS = Object.keys(PRICING);
const BUNDLE_PRICE = 9000;

// Bundle-only discount codes — server-side validation
const DISCOUNT_CODES = {
  jesuisvif:    { bundle_only: true, new_price: 4900 },
  archbundle26: { bundle_only: true, new_price: 4900 },
};

function normalizeIds(body) {
  // legacy: {products:["shard","keys"]}
  if (Array.isArray(body.products)) return body.products.filter(Boolean);
  // current: {items:[{id:"shard"},{id:"keys"}]}
  if (Array.isArray(body.items)) {
    return body.items
      .map(it => (typeof it === "string" ? it : it && it.id))
      .filter(Boolean);
  }
  return [];
}

export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json();
    let ids = normalizeIds(body);
    if (!ids.length) {
      return new Response(JSON.stringify({ error: "no products" }), { status: 400, headers: J });
    }

    // Auto-bundle when all individual plugins selected
    const isBundleAlias = ids.length === 1 && ids[0] === "bundle";
    const isFullBundle = ALL_IDS.every(id => ids.includes(id));
    const isBundle = isBundleAlias || isFullBundle;
    if (isBundle) ids = ["bundle"];

    // Validate discount code (server-side only — client display is decorative)
    let bundlePrice = BUNDLE_PRICE;
    let discountUsed = null;
    const discountCode = (body.discount_code || "").toLowerCase().trim();
    if (discountCode) {
      const dc = DISCOUNT_CODES[discountCode];
      if (!dc) {
        return new Response(JSON.stringify({ error: "invalid discount code" }), { status: 400, headers: J });
      }
      if (dc.bundle_only && !isBundle) {
        return new Response(JSON.stringify({ error: "discount code is bundle-only" }), { status: 400, headers: J });
      }
      bundlePrice = dc.new_price;
      discountUsed = discountCode;
    }

    const origin = request.headers.get("origin") || "https://arch.ooo";
    const params = new URLSearchParams();
    params.append("mode", "payment");
    params.append("success_url", origin + "/plugins/success?session_id={CHECKOUT_SESSION_ID}");
    params.append("cancel_url", origin + "/plugins");
    if (body.email) params.append("customer_email", body.email);
    params.append("metadata[products]", ids.join(","));
    if (discountUsed) params.append("metadata[discount]", discountUsed);

    if (isBundle) {
      params.append("line_items[0][price_data][currency]", "eur");
      params.append("line_items[0][price_data][product_data][name]",
        discountUsed ? "arch audio bundle (discount: " + discountUsed + ")" : "arch audio bundle");
      params.append("line_items[0][price_data][unit_amount]", String(bundlePrice));
      params.append("line_items[0][quantity]", "1");
    } else {
      ids.forEach((id, i) => {
        const price = PRICING[id];
        if (!price) throw new Error("unknown product: " + id);
        params.append(`line_items[${i}][price_data][currency]`, "eur");
        params.append(`line_items[${i}][price_data][product_data][name]`, "arch audio · " + id);
        params.append(`line_items[${i}][price_data][unit_amount]`, String(price));
        params.append(`line_items[${i}][quantity]`, "1");
      });
    }

    const r = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + env.STRIPE_SECRET_KEY,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    });
    const session = await r.json();
    if (session.error) throw new Error(session.error.message);

    return new Response(JSON.stringify({ url: session.url, session_id: session.id }), { headers: J });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: J });
  }
}
