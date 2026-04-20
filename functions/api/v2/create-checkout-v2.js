const J = { "Content-Type": "application/json" };

const PRICES = {
  shard: "price_1THRVuLc6BH4mqFmvOfggUWN",
  keys:  "price_1THRVvLc6BH4mqFmKTf61WNX",
  grain: "price_1THRVwLc6BH4mqFmWOM41vii",
  fmnt:  "price_1THRVxLc6BH4mqFm4VUfiRDT",
  cmpr:  "price_1THRVyLc6BH4mqFmWQNcqpra",
  eqls:  "price_1THRVzLc6BH4mqFmQg6h0lXC",
  dist:  "price_1THRW0Lc6BH4mqFmRQzvR9qV",
  sprd:  "price_1THRW1Lc6BH4mqFmGXuPez5P",
  clpr:  "price_1THRW1Lc6BH4mqFmS5SUHvLV",
  dly:   "price_1THRW2Lc6BH4mqFmphwBXIif",
  dck:   "price_1THRW3Lc6BH4mqFmFfh2VZlZ",
};
const ALL = Object.keys(PRICES);

export async function onRequestPost({ request, env }) {
  try {
    const { products, email } = await request.json();
    if (!products || !Array.isArray(products) || products.length === 0) {
      return new Response(JSON.stringify({ error: "no products" }), { status: 400, headers: J });
    }

    let items = products;
    if (ALL.every(id => items.includes(id))) items = ["bundle"];

    const origin = request.headers.get("origin") || "https://arch.ooo";
    const params = new URLSearchParams();
    params.append("mode", "payment");
    params.append("success_url", origin + "/plugins/success?session_id={CHECKOUT_SESSION_ID}");
    params.append("cancel_url", origin + "/plugins");
    if (email) params.append("customer_email", email);
    params.append("metadata[products]", items.join(","));

    if (items.length === 1 && items[0] === "bundle") {
      params.append("line_items[0][price_data][currency]", "eur");
      params.append("line_items[0][price_data][product_data][name]", "arch audio bundle");
      params.append("line_items[0][price_data][unit_amount]", "9000");
      params.append("line_items[0][quantity]", "1");
    } else {
      items.forEach((id, i) => {
        const p = PRICES[id];
        if (!p) throw new Error("unknown product: " + id);
        params.append(`line_items[${i}][price]`, p);
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
