import Stripe from "stripe";

const cors = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
};

export default async (req) => {
  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });
  try {
    const { session_id } = await req.json();
    if (!session_id) return new Response(JSON.stringify({ error: "missing session_id" }), { status: 400, headers: cors });
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const session = await stripe.checkout.sessions.retrieve(session_id);
    return new Response(JSON.stringify({
      valid: session.payment_status === "paid" || session.payment_status === "no_payment_required",
      product: session.metadata?.product || null,
    }), { headers: cors });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: cors });
  }
};

export const config = { path: "/api/verify-session" };
