import { getStore } from "@netlify/blobs";

const cors = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
};

export default async (req) => {
  const store = getStore("messages");

  if (req.method === "GET") {
    const { blobs } = await store.list();
    const messages = [];
    for (const b of blobs) {
      const raw = await store.get(b.key);
      try {
        messages.push(JSON.parse(raw));
      } catch {
        messages.push({ message: raw, date: new Date(0).toISOString() });
      }
    }
    messages.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    return new Response(JSON.stringify({ messages, total: messages.length }), { headers: cors });
  }

  if (req.method === "POST") {
    try {
      const { message } = await req.json();
      const trimmed = (message || "").trim();
      if (!trimmed) return new Response(JSON.stringify({ error: "empty message" }), { status: 400, headers: cors });
      if (trimmed.length > 2000) return new Response(JSON.stringify({ error: "too long" }), { status: 400, headers: cors });
      const key = Date.now().toString() + "-" + Math.random().toString(36).slice(2, 8);
      await store.set(key, JSON.stringify({ message: trimmed, date: new Date().toISOString() }));
      return new Response(JSON.stringify({ ok: true }), { headers: cors });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: cors });
    }
  }

  return new Response("method not allowed", { status: 405 });
};

export const config = { path: "/api/v2/store-message" };
