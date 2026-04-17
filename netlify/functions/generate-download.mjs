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

export default async (req) => {
  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });

  try {
    const { product, platform } = await req.json();
    if (!product || !DRIVE_LINKS[product]) {
      return new Response(JSON.stringify({ error: "unknown product" }), { status: 400, headers: cors });
    }
    const plat = platform === "win" || platform === "windows" ? "win" : "mac";
    const url = DRIVE_LINKS[product][plat];

    // track
    try {
      const store = getStore("downloads");
      const key = product + "-" + plat;
      const current = parseInt(await store.get(key) || "0");
      await store.set(key, String(current + 1));
    } catch {}

    return new Response(JSON.stringify({ url, product, platform: plat }), { headers: cors });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: cors });
  }
};

export const config = { path: "/api/v2/generate-download" };
