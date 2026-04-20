const J = { "Content-Type": "application/json" };

const PROMOS = {
  "arch-family": { max: null, type: "unlimited" },
  "arch-2026":   { max: 50,   type: "limited" },
  "jtmtmtmtm":   { max: null, type: "unlimited" },
};
const ALL = ["shard","keys","grain","fmnt","cmpr","eqls","dist","sprd","clpr","dly","dck"];

function randomHex(n) {
  const a = new Uint8Array(n);
  crypto.getRandomValues(a);
  return Array.from(a).map(b => b.toString(16).padStart(2, "0")).join("");
}

export async function onRequestPost({ request, env }) {
  try {
    const { code, products } = await request.json();
    const key = (code || "").toLowerCase().trim();
    const promo = PROMOS[key];
    if (!promo) {
      return new Response(JSON.stringify({ valid: false, error: "code invalide" }), { headers: J });
    }
    if (promo.max !== null) {
      const list = await env.KV_REDEMPTIONS.list({ prefix: key + ":" });
      if (list.keys.length >= promo.max) {
        return new Response(JSON.stringify({ valid: false, error: "limite atteinte" }), { headers: J });
      }
    }
    const sessionId = "promo_" + randomHex(16);
    const selected = (products && products.length) ? products : ALL;
    await env.KV_REDEMPTIONS.put(key + ":" + sessionId, JSON.stringify({
      session_id: sessionId, code: key, products: selected,
      amount: 0, date: new Date().toISOString(),
    }));
    return new Response(JSON.stringify({ valid: true, session_id: sessionId, code: key }), { headers: J });
  } catch (err) {
    return new Response(JSON.stringify({ valid: false, error: err.message }), { status: 500, headers: J });
  }
}
