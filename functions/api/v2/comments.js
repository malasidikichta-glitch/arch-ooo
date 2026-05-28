// Public forum-style comments per thread (?thread=niyyah).
// GET  /api/v2/comments?thread=niyyah → { thread, comments: [...], total }
// POST /api/v2/comments               → { thread, name, message, reply_to? }
// DELETE /api/v2/comments/:id         → admin (uses /api/v2/comments/[id].js)
const J = { "Content-Type": "application/json" };

const MAX_NAME = 40;
const MAX_MSG  = 2000;

function clamp(s, n) { return (s || "").toString().trim().slice(0, n); }
function sanitize(s) { return s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ""); }

function isValidThread(t) {
  return typeof t === "string" && /^[a-z0-9_-]{1,40}$/i.test(t);
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const thread = url.searchParams.get("thread") || "niyyah";
  if (!isValidThread(thread)) {
    return new Response(JSON.stringify({ error: "invalid thread" }), { status: 400, headers: J });
  }
  const list = await env.KV_COMMENTS.list({ prefix: thread + ":" });
  const comments = [];
  for (const k of list.keys) {
    const raw = await env.KV_COMMENTS.get(k.name);
    try {
      const c = JSON.parse(raw);
      // hide soft-deleted
      if (c.deleted) continue;
      comments.push(c);
    } catch {}
  }
  // oldest first (forum reading order)
  comments.sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  return new Response(JSON.stringify({ thread, comments, total: comments.length }), { headers: J });
}

export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json();
    const thread = body.thread || "niyyah";
    if (!isValidThread(thread)) {
      return new Response(JSON.stringify({ error: "invalid thread" }), { status: 400, headers: J });
    }
    const name = clamp(sanitize(body.name || "anonyme"), MAX_NAME) || "anonyme";
    const message = clamp(sanitize(body.message || ""), MAX_MSG);
    if (!message) {
      return new Response(JSON.stringify({ error: "message vide" }), { status: 400, headers: J });
    }
    // very light anti-spam: reject if message contains > 3 URLs
    const urls = (message.match(/https?:\/\//gi) || []).length;
    if (urls > 3) {
      return new Response(JSON.stringify({ error: "trop de liens" }), { status: 400, headers: J });
    }
    const ts = Date.now();
    const id = ts.toString(36) + "-" + Math.random().toString(36).slice(2, 8);
    const key = thread + ":" + ts.toString().padStart(15, "0") + "-" + id;
    const comment = {
      id,
      thread,
      name,
      message,
      date: new Date(ts).toISOString(),
      reply_to: body.reply_to ? String(body.reply_to).slice(0, 50) : null,
    };
    await env.KV_COMMENTS.put(key, JSON.stringify(comment));
    return new Response(JSON.stringify({ ok: true, comment }), { headers: J });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: J });
  }
}
