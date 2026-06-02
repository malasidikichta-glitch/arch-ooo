// Public forum-style comments per thread (?thread=niyyah).
// GET  /api/v2/comments?thread=niyyah          → public list (no _meta)
// GET  /api/v2/comments?thread=niyyah&admin=1  → list with _meta (requires /label session)
// POST /api/v2/comments                        → captures _meta from request.cf
// DELETE /api/v2/comments/:id                  → admin (uses /api/v2/comments/[id].js)
import { requireAuth } from "../../_lib/auth.js";
const J = { "Content-Type": "application/json" };

const MAX_NAME = 40;
const MAX_MSG  = 2000;

function captureMeta(request) {
  const cf = request.cf || {};
  const h  = request.headers;
  return {
    ip:       h.get("CF-Connecting-IP") || "",
    ua:       (h.get("User-Agent") || "").slice(0, 400),
    lang:     (h.get("Accept-Language") || "").slice(0, 80),
    ref:      (h.get("Referer") || "").slice(0, 400),
    sec_ua:   (h.get("Sec-CH-UA") || "").slice(0, 200),
    sec_mob:  h.get("Sec-CH-UA-Mobile") || "",
    sec_plat: (h.get("Sec-CH-UA-Platform") || "").slice(0, 40),
    country:  cf.country || "",
    city:     cf.city || "",
    region:   cf.region || "",
    postal:   cf.postalCode || "",
    lat:      cf.latitude || "",
    lng:      cf.longitude || "",
    tz:       cf.timezone || "",
    asn:      cf.asn || null,
    as_org:   cf.asOrganization || "",
    colo:     cf.colo || "",
    tls:      cf.tlsVersion || "",
    http:     cf.httpProtocol || "",
    ts:       Date.now(),
  };
}

function clamp(s, n) { return (s || "").toString().trim().slice(0, n); }
function sanitize(s) { return s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ""); }

function isValidThread(t) {
  return typeof t === "string" && /^[a-z0-9_-]{1,40}$/i.test(t);
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const thread = url.searchParams.get("thread") || "niyyah";
  const isAdmin = url.searchParams.get("admin") === "1";
  if (!isValidThread(thread)) {
    return new Response(JSON.stringify({ error: "invalid thread" }), { status: 400, headers: J });
  }
  // admin=1 requires a /label session. otherwise it's the regular public list.
  const admin = isAdmin ? await requireAuth(request, env) : null;
  if (isAdmin && !admin) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: J });
  }
  const prefix = thread === "*" ? "" : thread + ":";
  const list = await env.KV_COMMENTS.list({ prefix });
  const comments = [];
  for (const k of list.keys) {
    const raw = await env.KV_COMMENTS.get(k.name);
    try {
      const c = JSON.parse(raw);
      // skip non-comment keys when scanning everything
      if (thread === "*" && !c.thread) continue;
      // hide soft-deleted in public view; admins see everything
      if (c.deleted && !admin) continue;
      // strip server-only metadata for the public response
      if (!admin) delete c._meta;
      comments.push(c);
    } catch {}
  }
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
      // server-only forensic metadata. stripped from public GET; only returned
      // to authenticated /label sessions via ?admin=1.
      _meta: captureMeta(request),
    };
    await env.KV_COMMENTS.put(key, JSON.stringify(comment));
    // Public response intentionally omits _meta so the client sees exactly
    // what an anonymous reader would see — the experience is unchanged.
    const publicCopy = { ...comment };
    delete publicCopy._meta;
    return new Response(JSON.stringify({ ok: true, comment: publicCopy }), { headers: J });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: J });
  }
}
