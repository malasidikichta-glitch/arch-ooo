const J = { "Content-Type": "application/json" };

const PRODUCTS = {
  "arch-tee": {
    name: "arch tee",
    price: 3000, // cents EUR
    description: "t-shirt arch · coton 100%",
  },
};
const VALID_SIZES = ["s", "m", "l", "xl"];

export async function onRequestPost({ request, env }) {
  try {
    const { product, size } = await request.json();
    const p = PRODUCTS[product];
    if (!p) return new Response(JSON.stringify({ error: "unknown product" }), { status: 400, headers: J });
    const sz = (size || "").toLowerCase();
    if (!VALID_SIZES.includes(sz)) return new Response(JSON.stringify({ error: "invalid size" }), { status: 400, headers: J });

    const origin = request.headers.get("origin") || "https://arch.ooo";
    const params = new URLSearchParams();
    params.append("mode", "payment");
    params.append("success_url", `${origin}/shop/success?session_id={CHECKOUT_SESSION_ID}`);
    params.append("cancel_url", `${origin}/shop`);

    params.append("line_items[0][price_data][currency]", "eur");
    params.append("line_items[0][price_data][product_data][name]", `${p.name} — ${sz.toUpperCase()}`);
    params.append("line_items[0][price_data][product_data][description]", p.description);
    params.append("line_items[0][price_data][unit_amount]", String(p.price));
    params.append("line_items[0][quantity]", "1");

    params.append("metadata[product]", product);
    params.append("metadata[size]", sz);
    params.append("metadata[kind]", "merch");

    // shipping (free, all countries we ship to)
    params.append("shipping_address_collection[allowed_countries][0]", "FR");
    params.append("shipping_address_collection[allowed_countries][1]", "BE");
    params.append("shipping_address_collection[allowed_countries][2]", "CH");
    params.append("shipping_address_collection[allowed_countries][3]", "LU");
    params.append("shipping_address_collection[allowed_countries][4]", "DE");
    params.append("shipping_address_collection[allowed_countries][5]", "IT");
    params.append("shipping_address_collection[allowed_countries][6]", "ES");
    params.append("shipping_address_collection[allowed_countries][7]", "NL");
    params.append("shipping_address_collection[allowed_countries][8]", "GB");
    params.append("shipping_address_collection[allowed_countries][9]", "PT");

    // phone collection (optional but helpful for shipping)
    params.append("phone_number_collection[enabled]", "true");

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
