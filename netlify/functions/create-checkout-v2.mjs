import Stripe from "stripe";

const cors = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
};

const PRODUCTS = {
  shard:  { priceId: "price_1THRVuLc6BH4mqFmvOfggUWN", name: "shard",  price: 2000 },
  keys:   { priceId: "price_1THRVvLc6BH4mqFmKTf61WNX", name: "keys",   price: 2000 },
  grain:  { priceId: "price_1THRVwLc6BH4mqFmWOM41vii", name: "grain",  price: 2000 },
  fmnt:   { priceId: "price_1THRVxLc6BH4mqFm4VUfiRDT", name: "fmnt",   price: 1000 },
  cmpr:   { priceId: "price_1THRVyLc6BH4mqFmWQNcqpra", name: "cmpr",   price: 1000 },
  eqls:   { priceId: "price_1THRVzLc6BH4mqFmQg6h0lXC", name: "eqls",   price: 1000 },
  dist:   { priceId: "price_1THRW0Lc6BH4mqFmRQzvR9qV", name: "dist",   price: 1000 },
  sprd:   { priceId: "price_1THRW1Lc6BH4mqFmGXuPez5P", name: "sprd",   price: 1000 },
  clpr:   { priceId: "price_1THRW1Lc6BH4mqFmS5SUHvLV", name: "clpr",   price: 1000 },
  dly:    { priceId: "price_1THRW2Lc6BH4mqFmphwBXIif", name: "dly",    price: 1000 },
  dck:    { priceId: "price_1THRW3Lc6BH4mqFmFfh2VZlZ", name: "dck",    price: 1000 },
  bundle: { name: "arch audio bundle", price: 9000 },
};

const ALL_IDS = Object.keys(PRODUCTS).filter(k => k !== "bundle");

export default async (req) => {
  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });

  try {
    const { products, email } = await req.json();
    if (!products || !Array.isArray(products) || products.length === 0) {
      return new Response(JSON.stringify({ error: "no products" }), { status: 400, headers: cors });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    // auto-bundle when all individual plugins selected
    let items = products;
    if (ALL_IDS.every(id => items.includes(id))) items = ["bundle"];

    let line_items;
    if (items.length === 1 && items[0] === "bundle") {
      line_items = [{
        price_data: {
          currency: "eur",
          product_data: { name: "arch audio bundle" },
          unit_amount: 9000,
        },
        quantity: 1,
      }];
    } else {
      line_items = items.map(id => {
        const p = PRODUCTS[id];
        if (!p || !p.priceId) throw new Error("unknown product: " + id);
        return { price: p.priceId, quantity: 1 };
      });
    }

    const origin = req.headers.get("origin") || "https://arch.ooo";
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items,
      customer_email: email || undefined,
      success_url: `${origin}/plugins/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/plugins`,
      metadata: { products: items.join(",") },
    });

    return new Response(JSON.stringify({ url: session.url, session_id: session.id }), { headers: cors });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: cors });
  }
};

export const config = { path: "/api/v2/create-checkout-v2" };
