// Sync Shotgun events (arch-inc venue) into KV_EVENTS.
// Call with ?pw=<admin> to trigger. Scrapes via facebookexternalhit UA which bypasses Vercel bot-check.
//
// Strategy:
// 1. Fetch venue page + DDG search for past events → collect all event URLs
// 2. For each URL, fetch with facebookbot UA → parse JSON-LD Event + OG meta
// 3. Upsert into KV_EVENTS with id = slug
const J = { "Content-Type": "application/json" };
const ADMIN_PW = "j'aimelesdatas";
const UA = "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)";

const VENUE_URL = "https://shotgun.live/fr/venues/arch-inc";

const DDG_QUERIES = [
  "site:shotgun.live/fr/events arch-club",
  "site:shotgun.live/fr/events arch",
  "site:shotgun.live/fr/events \"arch club\"",
  "site:shotgun.live/fr/events \"arch @\"",
  "site:shotgun.live arch clermont",
  "site:shotgun.live arch paris",
  "site:shotgun.live arch lyon",
];

// Candidate slugs (from past events screenshot / known patterns) — will be probed
// and kept only if they actually have arch-inc as organizer.
// Slugs explicitly excluded — these events must never appear on the site.
const EXCLUDE_SLUGS = new Set([
  "arch-start-n-stop",
  "arch-start-n-stop-24-10",
]);

const CANDIDATE_SLUGS = [
  // known good (confirmed)
  "arch-club-le-rex-de-toulouse",
  "arch-club-gaite-lyrique-paris",
  "arch-club-transbordeur",
  "arch-club-main-room",
  // boule noire variants
  "arch-club-la-boule-noire",
  "arch-club-boule-noire",
  "arch-club-la-boule-noire-paris",
  "arch-club-boule-noire-paris",
  "arch-club-paris-la-boule-noire",
  "arch-boule-noire",
  "arch-la-boule-noire",
  "arch-club-la-boule-noire-26-09",
  "arch-club-la-boule-noire-2025",
  // generic arch-club numbered
  "arch",
  "arch-2",
  "arch-club",
  "arch-club-2",
  "arch-club-3",
  "arch-club-4",
  "arch-club-5",
  "arch-club-6",
  // high-lo lyon
  "arch-club-high-lo-lyon",
];

async function get(url, ua = UA) {
  const r = await fetch(url, { headers: { "User-Agent": ua, "Accept": "text/html" }, redirect: "follow" });
  return { status: r.status, body: await r.text() };
}

function meta(html, prop) {
  const re = new RegExp(`<meta[^>]+(?:property|name)="${prop}"[^>]+content="([^"]*)"`, "i");
  const m = html.match(re);
  return m ? m[1].replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'") : null;
}

function findLdJson(html, type) {
  const re = /<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    try {
      const d = JSON.parse(m[1]);
      const items = Array.isArray(d) ? d : [d];
      for (const item of items) {
        if (item["@type"] === type || (Array.isArray(item["@type"]) && item["@type"].includes(type))) return item;
        if (item["@graph"]) for (const g of item["@graph"]) if (g["@type"] === type || (Array.isArray(g["@type"]) && g["@type"].includes(type))) return g;
      }
    } catch {}
  }
  return null;
}

function parseEvent(html, url) {
  const event = findLdJson(html, "Event") || findLdJson(html, "MusicEvent");
  const out = { ticket_url: url, source: "shotgun" };
  if (event) {
    out.title = event.name || null;
    out.date = event.startDate || null;
    out.end_date = event.endDate || null;
    const loc = event.location || {};
    out.venue = loc.name || null;
    const addr = loc.address || {};
    out.city = addr.addressLocality || addr.addressRegion || null;
    out.country = addr.addressCountry || null;
    const performers = Array.isArray(event.performer) ? event.performer : (event.performer ? [event.performer] : []);
    out.lineup = performers.map(p => p.name).filter(Boolean);
    out.image = event.image?.url || event.image || null;
  }
  // Fallback: OG meta
  if (!out.title) out.title = meta(html, "og:title");
  if (!out.image) out.image = meta(html, "og:image");
  // Parse date from OG description ("le 2 mai 2026")
  if (!out.date) {
    const desc = meta(html, "og:description") || "";
    out.og_description = desc;
  }
  return out;
}

function slugFromUrl(url) {
  const m = url.match(/\/events\/([a-z0-9\-]+)/);
  return m ? m[1] : null;
}

function cleanTitle(raw) {
  if (!raw) return null;
  // "Arch Club - La Coopérative De Mai, Clermont-Ferrand · Billets Shotgun" → "arch club · la coopé de mai"
  return raw
    .replace(/\s*·\s*Billets Shotgun\s*$/i, "")
    .replace(/^\s*Billets pour\s+/i, "")
    .trim();
}

async function collectEventUrls() {
  const set = new Set();
  // 1. Venue page (upcoming)
  try {
    const v = await get(VENUE_URL);
    if (v.status === 200) {
      for (const m of v.body.matchAll(/\/fr\/events\/([a-z0-9\-]+)/gi)) set.add("https://shotgun.live/fr/events/" + m[1]);
    }
  } catch {}
  // 2. Multiple DDG queries
  for (const q of DDG_QUERIES) {
    try {
      const d = await get("https://lite.duckduckgo.com/lite/?q=" + encodeURIComponent(q), "Mozilla/5.0");
      for (const m of d.body.matchAll(/https?:\/\/shotgun\.live\/(?:fr|en)\/events\/([a-z0-9\-]+)/gi)) {
        const slug = m[1].toLowerCase();
        if (slug.startsWith("arch") && !slug.startsWith("arc-")) {
          set.add("https://shotgun.live/fr/events/" + slug);
        }
      }
    } catch {}
  }
  // 3. Candidate slug probes
  for (const slug of CANDIDATE_SLUGS) {
    set.add("https://shotgun.live/fr/events/" + slug);
  }
  return [...set];
}

// Validate event belongs to ARCH venue (from JSON-LD or OG content)
function isArchEvent(html) {
  if (/arch[-\s]?inc/i.test(html)) return true;
  if (/"organizer"[^}]*"name"\s*:\s*"ARCH/i.test(html)) return true;
  if (/"Organization"[^}]*"ARCH"/i.test(html)) return true;
  return false;
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const pw = url.searchParams.get("pw");
  const dry = url.searchParams.get("dry") === "1";
  if (pw !== ADMIN_PW) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: J });

  const urls = (await collectEventUrls()).filter(u => {
    const slug = slugFromUrl(u);
    return slug && !EXCLUDE_SLUGS.has(slug);
  });
  const parsed = [];
  for (const u of urls) {
    try {
      const r = await get(u);
      if (r.status !== 200) { parsed.push({ url: u, status: r.status, skipped: true }); continue; }
      if (!isArchEvent(r.body)) { parsed.push({ url: u, skipped: true, reason: "not an arch event" }); continue; }
      const e = parseEvent(r.body, u);
      e.id = slugFromUrl(u);
      e.title = cleanTitle(e.title);
      parsed.push(e);
    } catch (err) { parsed.push({ url: u, error: err.message }); }
  }

  if (dry) return new Response(JSON.stringify({ urls, parsed }, null, 2), { headers: J });

  // Upsert
  let created = 0, updated = 0, skipped = 0;
  for (const e of parsed) {
    if (!e.id || !e.title) { skipped++; continue; }
    const key = "event:" + e.id;
    const existing = await env.KV_EVENTS.get(key);
    const base = existing ? JSON.parse(existing) : { created_at: new Date().toISOString() };
    const merged = {
      ...base,
      id: e.id,
      title: e.title,
      date: e.date || base.date || "",
      venue: e.venue || base.venue || "",
      city: e.city || base.city || "",
      lineup: (e.lineup && e.lineup.length) ? e.lineup : (base.lineup || []),
      ticket_url: e.ticket_url,
      image: e.image || base.image || null,
      source: "shotgun",
      updated_at: new Date().toISOString(),
      hidden: base.hidden || false,
    };
    await env.KV_EVENTS.put(key, JSON.stringify(merged));
    if (existing) updated++; else created++;
  }

  return new Response(JSON.stringify({
    ok: true, total_found: urls.length, created, updated, skipped, events: parsed,
  }, null, 2), { headers: J });
}
