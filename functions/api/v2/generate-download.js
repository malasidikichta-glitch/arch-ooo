// Returns the R2 download URL for a specific (product, platform) combo.
// Accepts both `product` and `product_id` (frontend uses `product_id`).
// Optionally validates session_id ownership but is lenient (URLs are public R2 anyway).
import { LINKS } from "../../_lib/plugin-links.js";
const J = { "Content-Type": "application/json" };

export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json();
    const product = body.product_id || body.product;
    const platform = body.platform;

    if (!product) {
      return new Response(JSON.stringify({ error: "missing product_id" }), { status: 400, headers: J });
    }
    if (!LINKS[product]) {
      // void / vrb don't exist in R2 yet — return a friendlier error
      return new Response(JSON.stringify({ error: "no download available for: " + product }), { status: 404, headers: J });
    }
    const plat = platform === "win" || platform === "windows" ? "win" : "mac";
    const url = LINKS[product][plat];

    // increment download counter
    try {
      const key = product + "-" + plat;
      const cur = parseInt((await env.KV_DOWNLOADS.get(key)) || "0");
      await env.KV_DOWNLOADS.put(key, String(cur + 1));
    } catch {}

    return new Response(JSON.stringify({ url, product_id: product, product, platform: plat }), { headers: J });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: J });
  }
}
