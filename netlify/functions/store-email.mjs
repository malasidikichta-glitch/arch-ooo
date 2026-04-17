import { getStore } from "@netlify/blobs";

const cors = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
};

export default async (req) => {
  const store = getStore("emails");

  if (req.method === "GET") {
    const { blobs } = await store.list();
    const emails = [];
    for (const b of blobs) {
      const raw = await store.get(b.key);
      try {
        emails.push(JSON.parse(raw));
      } catch {
        emails.push({ email: b.key, date: new Date(0).toISOString() });
      }
    }
    emails.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    return new Response(JSON.stringify({ emails, total: emails.length }), { headers: cors });
  }

  if (req.method === "POST") {
    try {
      const { email } = await req.json();
      if (!email || !email.includes("@")) {
        return new Response(JSON.stringify({ error: "invalid email" }), { status: 400, headers: cors });
      }
      const key = email.toLowerCase().trim();
      const existing = await store.get(key);
      if (!existing) {
        await store.set(key, JSON.stringify({ email: key, date: new Date().toISOString() }));
      }
      return new Response(JSON.stringify({ ok: true }), { headers: cors });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: cors });
    }
  }

  return new Response("method not allowed", { status: 405 });
};

export const config = { path: "/api/v2/store-email" };
