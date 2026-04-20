const J = { "Content-Type": "application/json" };

// Legacy V1 — 0€ session (free plugin) for tracking only.
export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json().catch(() => ({}));
    const product = body.product || "archbundle";
    const origin = request.headers.get("origin") || "https://arch.ooo";

    const params = new URLSearchParams();
    params.append("mode", "payment");
    params.append("success_url", `${origin}/plugins/success?session_id={CHECKOUT_SESSION_ID}&product=${product}`);
    params.append("cancel_url", origin + "/plugins");
    params.append("metadata[product]", product);
    params.append("line_items[0][price_data][currency]", "eur");
    params.append("line_items[0][price_data][product_data][name]", product);
    params.append("line_items[0][price_data][unit_amount]", "0");
    params.append("line_items[0][quantity]", "1");

    const r = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: { Authorization: "Bearer " + env.STRIPE_SECRET_KEY, "Content-Type": "application/x-www-form-urlencoded" },
      body: params,
    });
    const session = await r.json();
    if (session.error) throw new Error(session.error.message);
    return new Response(JSON.stringify({ url: session.url }), { headers: J });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: J });
  }
}
