import { getStore } from "@netlify/blobs";
import crypto from "node:crypto";

const cors = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
};

const PROMOS = {
  "arch-family": { max: null, type: "unlimited" },
  "arch-2026": { max: 50, type: "limited" },
  "jtmtmtmtm": { max: null, type: "unlimited" },
};

const ALL_PRODUCTS = ["shard", "keys", "grain", "fmnt", "cmpr", "eqls", "dist", "sprd", "clpr", "dly", "dck", "bundle"];

export default async (req) => {
  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });
  try {
    const { code, products } = await req.json();
    const key = (code || "").toLowerCase().trim();
    const promo = PROMOS[key];
    if (!promo) {
      return new Response(JSON.stringify({ valid: false, error: "code invalide" }), { headers: cors });
    }

    const redemptionStore = getStore("redemptions");
    if (promo.max !== null) {
      const { blobs } = await redemptionStore.list({ prefix: key + ":" });
      if (blobs.length >= promo.max) {
        return new Response(JSON.stringify({ valid: false, error: "limite atteinte" }), { headers: cors });
      }
    }

    const sessionId = "promo_" + crypto.randomBytes(16).toString("hex");
    const redemptionKey = key + ":" + sessionId;
    const selectedProducts = (products && products.length) ? products : ALL_PRODUCTS.filter(p => p !== "bundle");
    const payload = {
      session_id: sessionId,
      code: key,
      products: selectedProducts,
      amount: 0,
      date: new Date().toISOString(),
    };
    await redemptionStore.set(redemptionKey, JSON.stringify(payload));

    return new Response(JSON.stringify({ valid: true, session_id: sessionId, code: key }), { headers: cors });
  } catch (err) {
    return new Response(JSON.stringify({ valid: false, error: err.message }), { status: 500, headers: cors });
  }
};

export const config = { path: "/api/v2/verify-promo-code" };
