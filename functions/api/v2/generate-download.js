import { LINKS } from "../../_lib/plugin-links.js";
const J = { "Content-Type": "application/json" };

export async function onRequestPost({ request, env }) {
  try {
    const { product, platform } = await request.json();
    if (!product || !LINKS[product]) {
      return new Response(JSON.stringify({ error: "unknown product" }), { status: 400, headers: J });
    }
    const plat = platform === "win" || platform === "windows" ? "win" : "mac";
    const url = LINKS[product][plat];

    try {
      const key = product + "-" + plat;
      const cur = parseInt((await env.KV_DOWNLOADS.get(key)) || "0");
      await env.KV_DOWNLOADS.put(key, String(cur + 1));
    } catch {}

    return new Response(JSON.stringify({ url, product, platform: plat }), { headers: J });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: J });
  }
}
