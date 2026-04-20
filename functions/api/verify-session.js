const J = { "Content-Type": "application/json" };

export async function onRequestPost({ request, env }) {
  try {
    const { session_id } = await request.json();
    if (!session_id) return new Response(JSON.stringify({ error: "missing session_id" }), { status: 400, headers: J });
    const r = await fetch("https://api.stripe.com/v1/checkout/sessions/" + encodeURIComponent(session_id), {
      headers: { Authorization: "Bearer " + env.STRIPE_SECRET_KEY },
    });
    const session = await r.json();
    if (session.error) throw new Error(session.error.message);
    return new Response(JSON.stringify({
      valid: session.payment_status === "paid" || session.payment_status === "no_payment_required",
      product: session.metadata?.product || null,
    }), { headers: J });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: J });
  }
}
