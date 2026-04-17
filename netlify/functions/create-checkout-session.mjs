import Stripe from "stripe";

const cors = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
};

export default async (req) => {
  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const body = await req.json().catch(() => ({}));
    const product = body.product || "archbundle";
    const origin = req.headers.get("origin") || "https://arch.ooo";

    // legacy V1 — free downloads, create a $0 session for tracking
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{
        price_data: {
          currency: "eur",
          product_data: { name: product },
          unit_amount: 0,
        },
        quantity: 1,
      }],
      success_url: `${origin}/plugins/success?session_id={CHECKOUT_SESSION_ID}&product=${product}`,
      cancel_url: `${origin}/plugins`,
      metadata: { product },
    });
    return new Response(JSON.stringify({ url: session.url }), { headers: cors });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: cors });
  }
};

export const config = { path: "/api/create-checkout-session" };
