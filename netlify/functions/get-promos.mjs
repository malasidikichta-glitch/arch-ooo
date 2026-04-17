import { getStore } from "@netlify/blobs";

const cors = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
};

export default async (req) => {
  if (req.method !== "GET") return new Response("method not allowed", { status: 405 });

  try {
    const store = getStore("redemptions");
    const { blobs } = await store.list();
    const code_counts = {};
    const recent = [];
    for (const b of blobs) {
      const raw = await store.get(b.key);
      try {
        const d = JSON.parse(raw);
        code_counts[d.code] = (code_counts[d.code] || 0) + 1;
        recent.push(d);
      } catch {}
    }
    recent.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    return new Response(JSON.stringify({
      code_counts,
      recent,
      total: recent.length,
    }), { headers: cors });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message, code_counts: {}, recent: [], total: 0 }), { status: 500, headers: cors });
  }
};

export const config = { path: "/api/v2/get-promos" };
