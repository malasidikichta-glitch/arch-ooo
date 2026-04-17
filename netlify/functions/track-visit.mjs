import { getStore } from "@netlify/blobs";

const cors = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
};

export default async (req) => {
  const store = getStore("visits");
  const today = new Date().toISOString().slice(0, 10);

  if (req.method === "GET") {
    const { blobs } = await store.list();
    const days = {};
    for (const b of blobs) {
      const v = parseInt(await store.get(b.key)) || 0;
      days[b.key] = v;
    }
    const total = Object.values(days).reduce((s, v) => s + v, 0);
    return new Response(JSON.stringify({ days, total }), { headers: cors });
  }

  if (req.method === "POST") {
    const current = parseInt(await store.get(today) || "0");
    await store.set(today, String(current + 1));
    return new Response(JSON.stringify({ ok: true, day: today, count: current + 1 }), { headers: cors });
  }

  return new Response("method not allowed", { status: 405 });
};

export const config = { path: "/api/v2/track-visit" };
