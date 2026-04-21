// Visit tracking with per-page counts.
// Storage scheme in KV_VISITS:
//   "YYYY-MM-DD"            → total for that day (all pages)
//   "YYYY-MM-DD:{page}"     → count for that day + page
//   "page:{page}"           → all-time total for that page
const J = { "Content-Type": "application/json" };

function todayISO() { return new Date().toISOString().slice(0, 10); }

async function inc(kv, key) {
  const cur = parseInt((await kv.get(key)) || "0");
  await kv.put(key, String(cur + 1));
  return cur + 1;
}

export async function onRequestGet({ env }) {
  const list = await env.KV_VISITS.list();
  const days = {};              // date → total visits that day
  const pages = {};             // page → { date → count }
  const pageTotals = {};        // page → all-time total
  for (const k of list.keys) {
    const name = k.name;
    const v = parseInt(await env.KV_VISITS.get(name)) || 0;
    if (name.startsWith("page:")) {
      pageTotals[name.slice(5)] = v;
      continue;
    }
    if (name.includes(":")) {
      const [date, page] = name.split(":", 2);
      pages[page] = pages[page] || {};
      pages[page][date] = v;
    } else {
      days[name] = v;
    }
  }
  const total = Object.values(days).reduce((s, v) => s + v, 0);
  return new Response(JSON.stringify({ days, pages, pageTotals, total }), { headers: J });
}

export async function onRequestPost({ request, env }) {
  let page = "unknown";
  try {
    const body = await request.json().catch(() => ({}));
    if (body.page && typeof body.page === "string") {
      page = body.page.toLowerCase().replace(/[^a-z0-9\-]/g, "").slice(0, 40) || "unknown";
    }
  } catch {}

  const day = todayISO();
  const dayTotal  = await inc(env.KV_VISITS, day);
  const dayPage   = await inc(env.KV_VISITS, `${day}:${page}`);
  const pageTotal = await inc(env.KV_VISITS, `page:${page}`);

  return new Response(JSON.stringify({
    ok: true, day, page,
    day_total: dayTotal, day_page: dayPage, page_total: pageTotal,
  }), { headers: J });
}
