import Stripe from "stripe";
import { getStore } from "@netlify/blobs";

const cors = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
};

const DRIVE_LINKS = {
  shard: { mac: "https://drive.google.com/uc?export=download&id=1_HtLcKNBU8Oug57LL1t2fpTJbPoXuFx5", win: "https://drive.google.com/uc?export=download&id=1dtsOvoqkf82Ph2t45cv_c5yChj-PUZmE" },
  grain: { mac: "https://drive.google.com/uc?export=download&id=1Zup8Jjmw5lmV-V04tBaJH6Ojm-SeWljR", win: "https://drive.google.com/uc?export=download&id=15QugWFubJ2mP1nbLT9fHqyPoh2ttWc_L" },
  keys:  { mac: "https://drive.google.com/uc?export=download&id=1ARiyeql4wEtxndfClD2n4XhRLEgt2f0I", win: "https://drive.google.com/uc?export=download&id=1bbKIWYYAyPw5luxPEfkcMselZTqWeX1B" },
  fmnt:  { mac: "https://drive.google.com/uc?export=download&id=1mv-sJzyYqFuUE251t_p8CDsTna2VFyxy", win: "https://drive.google.com/uc?export=download&id=18EMWAb5xDVtBSqRfArwmvsSo4C1_y3dF" },
  dly:   { mac: "https://drive.google.com/uc?export=download&id=1j_sUZT5EAd4t2_CV3weaJSdVCB2XUHPY", win: "https://drive.google.com/uc?export=download&id=1eR2nNDidKDzes0osbjII-bdGbjSUecpe" },
  cmpr:  { mac: "https://drive.google.com/uc?export=download&id=1FPT_mSZRSN1sBLhhZGxh74I_Yvxb8sGf", win: "https://drive.google.com/uc?export=download&id=1pN50zk6Tvapti8NpZ4HV3CdmSiwKWNMS" },
  eqls:  { mac: "https://drive.google.com/uc?export=download&id=1ydU1Nz1YikAEfTVgpAWXotUVgZHSlVw8", win: "https://drive.google.com/uc?export=download&id=1ncNoc8r7NYNZBwohEChAU5RMvT0MO1OH" },
  dist:  { mac: "https://drive.google.com/uc?export=download&id=1aCfaBV6xEHZmDUUhetYAr6raEqYIBrdU", win: "https://drive.google.com/uc?export=download&id=15r-Xuf7WWGxsncMJUSQFDrqm42NjryZ1" },
  sprd:  { mac: "https://drive.google.com/uc?export=download&id=1tnqkQYPzZBHswyZXmnBF8X-NW1EvOjvN", win: "https://drive.google.com/uc?export=download&id=16_yK-w0e8tEuXsbNTKN1nUZ417hK3kaj" },
  dck:   { mac: "https://drive.google.com/uc?export=download&id=1b6Q_YTFi3yDCBE27i70MR2xTFV1b7ZTG", win: "https://drive.google.com/uc?export=download&id=1XbDzXbAW86qZ6a4JMeaz7XnqP8pnRK0l" },
  clpr:  { mac: "https://drive.google.com/uc?export=download&id=1raLEXCFK9D9XrIKjxlhLsaHSa4oRxP7x", win: "https://drive.google.com/uc?export=download&id=1dVWai0uZBWVZK8SlJWW_4irN_ra94roh" },
};

function downloadsFor(ids) {
  const out = [];
  for (const id of ids) {
    if (id === "bundle") {
      for (const [pid, links] of Object.entries(DRIVE_LINKS)) {
        out.push({ product_id: pid, product_name: pid, download_mac: links.mac, download_win: links.win });
      }
    } else if (DRIVE_LINKS[id]) {
      out.push({ product_id: id, product_name: id, download_mac: DRIVE_LINKS[id].mac, download_win: DRIVE_LINKS[id].win });
    }
  }
  return out;
}

export default async (req) => {
  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });

  try {
    const { session_id } = await req.json();
    if (!session_id) return new Response(JSON.stringify({ error: "missing session_id" }), { status: 400, headers: cors });

    // promo session
    if (session_id.startsWith("promo_")) {
      const redemptionStore = getStore("redemptions");
      const { blobs } = await redemptionStore.list();
      for (const b of blobs) {
        if (b.key.endsWith(":" + session_id)) {
          const raw = await redemptionStore.get(b.key);
          try {
            const d = JSON.parse(raw);
            return new Response(JSON.stringify({
              is_promo: true,
              code: d.code,
              downloads: downloadsFor(d.products),
            }), { headers: cors });
          } catch {}
        }
      }
      return new Response(JSON.stringify({ error: "invalid promo session" }), { status: 404, headers: cors });
    }

    // Stripe session
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const session = await stripe.checkout.sessions.retrieve(session_id);
    if (session.payment_status !== "paid") {
      return new Response(JSON.stringify({ error: "payment not completed" }), { status: 402, headers: cors });
    }
    const products = (session.metadata?.products || "").split(",").filter(Boolean);
    return new Response(JSON.stringify({
      is_promo: false,
      downloads: downloadsFor(products),
    }), { headers: cors });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: cors });
  }
};

export const config = { path: "/api/v2/verify-session" };
