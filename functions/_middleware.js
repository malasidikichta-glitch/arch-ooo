// Adds permissive CORS headers to every /api response.
export async function onRequest(context) {
  const res = await context.next();
  const out = new Response(res.body, res);
  out.headers.set("Access-Control-Allow-Origin", "*");
  out.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  out.headers.set("Access-Control-Allow-Headers", "Content-Type");
  return out;
}
