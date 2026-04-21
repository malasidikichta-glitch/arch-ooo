// GET  /api/v2/releases → { xo: {artist, kind, id, url, title, cover, release_date}, duno: {...} }
// POST /api/v2/releases { pw, artist: "xo"|"duno", url } → admin update (pulls oEmbed for title/cover)
const J = { "Content-Type": "application/json" };
const ADMIN_PW = "j'aimelesdatas";

const ARTISTS = {
  xo:   { id: "0ZWPKOD6JKB2TGruY79QzP", name: "xo" },
  duno: { id: "4nXuz5MMlZir7Kg2UWsS1K", name: "duno" },
};

// Parses a Spotify URL like https://open.spotify.com/album/ABC?si=... → { kind: 'album', id: 'ABC' }
function parseSpotifyUrl(url) {
  if (!url) return null;
  const m = url.match(/open\.spotify\.com\/(?:intl-[a-z]+\/)?(album|track|playlist|episode)\/([A-Za-z0-9]{10,})/i);
  if (!m) return null;
  return { kind: m[1].toLowerCase(), id: m[2] };
}

function canonicalUrl(kind, id) { return `https://open.spotify.com/${kind}/${id}`; }

// Fetches Spotify oEmbed for enrichment (public, no auth).
async function oembed(url) {
  try {
    const r = await fetch("https://open.spotify.com/oembed?url=" + encodeURIComponent(url), {
      headers: { "User-Agent": "arch-ooo/1.0" },
    });
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; }
}

function extractCoverFromHtml(html) {
  // oEmbed returns an iframe src but no direct cover. Attempt fallback via artwork URL pattern.
  // Spotify doesn't expose cover via public API easily. Return null — the page will use the embed iframe.
  return null;
}

async function enrich(release) {
  if (!release?.kind || !release?.id) return release;
  const url = canonicalUrl(release.kind, release.id);
  const oe = await oembed(url);
  if (oe) {
    release.title = oe.title || release.title || null;
    release.thumbnail = oe.thumbnail_url || release.thumbnail || null;
    release.iframe_html = oe.html || null;
    release.provider = "spotify";
  }
  release.url = url;
  release.embed_url = `https://open.spotify.com/embed/${release.kind}/${release.id}?utm_source=generator&theme=0`;
  return release;
}

export async function onRequestGet({ env }) {
  const out = {};
  for (const key of Object.keys(ARTISTS)) {
    const raw = await env.KV_RELEASES.get("release:" + key);
    if (!raw) { out[key] = { artist: ARTISTS[key].name, release: null }; continue; }
    try {
      const r = JSON.parse(raw);
      out[key] = { artist: ARTISTS[key].name, artist_id: ARTISTS[key].id, release: await enrich(r) };
    } catch {
      out[key] = { artist: ARTISTS[key].name, error: "invalid data" };
    }
  }
  return new Response(JSON.stringify(out), { headers: J });
}

export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json();
    if (body.pw !== ADMIN_PW) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: J });
    const { artist, url } = body;
    if (!ARTISTS[artist]) return new Response(JSON.stringify({ error: "unknown artist" }), { status: 400, headers: J });
    const parsed = parseSpotifyUrl(url);
    if (!parsed) return new Response(JSON.stringify({ error: "invalid spotify url" }), { status: 400, headers: J });

    const release = {
      kind: parsed.kind,
      id: parsed.id,
      url: canonicalUrl(parsed.kind, parsed.id),
      updated_at: new Date().toISOString(),
    };
    await env.KV_RELEASES.put("release:" + artist, JSON.stringify(release));

    return new Response(JSON.stringify({ ok: true, release: await enrich(release) }), { headers: J });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: J });
  }
}
