const J = { "Content-Type": "application/json" };

export async function onRequestGet({ env }) {
  const list = await env.KV_DOWNLOADS.list();
  const counts = {};
  for (const k of list.keys) {
    counts[k.name] = parseInt(await env.KV_DOWNLOADS.get(k.name)) || 0;
  }
  return new Response(JSON.stringify(counts), { headers: J });
}

export async function onRequestPost({ request, env }) {
  try {
    const { product } = await request.json();
    if (!product) return new Response(JSON.stringify({ error: "missing product" }), { status: 400, headers: J });
    const cur = parseInt((await env.KV_DOWNLOADS.get(product)) || "0");
    await env.KV_DOWNLOADS.put(product, String(cur + 1));
    return new Response(JSON.stringify({ product, count: cur + 1 }), { headers: J });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: J });
  }
}
