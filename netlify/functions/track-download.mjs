import { getStore } from "@netlify/blobs";

const cors = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
};

export default async (req) => {
  const store = getStore("downloads");

  if (req.method === "GET") {
    const { blobs } = await store.list();
    const counts = {};
    for (const b of blobs) {
      counts[b.key] = parseInt(await store.get(b.key)) || 0;
    }
    return new Response(JSON.stringify(counts), { headers: cors });
  }

  if (req.method === "POST") {
    try {
      const { product } = await req.json();
      if (!product) return new Response(JSON.stringify({ error: "missing product" }), { status: 400, headers: cors });
      const current = parseInt(await store.get(product) || "0");
      await store.set(product, String(current + 1));
      return new Response(JSON.stringify({ product, count: current + 1 }), { headers: cors });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: cors });
    }
  }

  return new Response("method not allowed", { status: 405 });
};

export const config = { path: "/api/v2/track-download" };
