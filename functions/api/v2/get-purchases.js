const J = { "Content-Type": "application/json" };

export async function onRequestGet({ env }) {
  try {
    if (!env.STRIPE_SECRET_KEY) {
      return new Response(JSON.stringify({
        total_revenue: 0, total_purchases: 0, recent: [],
        error: "STRIPE_SECRET_KEY not configured",
      }), { headers: J });
    }
    const yearStart = Math.floor(new Date(new Date().getFullYear(), 0, 1).getTime() / 1000);
    const sessions = [];
    let hasMore = true;
    let startingAfter = null;
    while (hasMore) {
      const params = new URLSearchParams({
        limit: "100",
        "created[gte]": String(yearStart),
        "expand[]": "data.line_items",
      });
      if (startingAfter) params.append("starting_after", startingAfter);
      const r = await fetch("https://api.stripe.com/v1/checkout/sessions?" + params, {
        headers: { Authorization: "Bearer " + env.STRIPE_SECRET_KEY },
      });
      const list = await r.json();
      if (list.error) throw new Error(list.error.message);
      sessions.push(...list.data.filter(s => s.payment_status === "paid"));
      hasMore = list.has_more;
      if (list.data.length) startingAfter = list.data[list.data.length - 1].id;
    }

    let total_revenue = 0;
    const recent = [];
    for (const s of sessions) {
      const amount = s.amount_total || 0;
      total_revenue += amount;
      const products = (s.line_items?.data || []).map(li => li.description || "").filter(Boolean);
      recent.push({
        date: new Date(s.created * 1000).toISOString(),
        email: s.customer_details?.email || s.customer_email || null,
        products,
        amount,
      });
    }
    recent.sort((a, b) => b.date.localeCompare(a.date));
    return new Response(JSON.stringify({
      total_revenue, total_purchases: recent.length, recent,
    }), { headers: J });
  } catch (err) {
    return new Response(JSON.stringify({
      error: err.message, total_revenue: 0, total_purchases: 0, recent: [],
    }), { status: 500, headers: J });
  }
}
