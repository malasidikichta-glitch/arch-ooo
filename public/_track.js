// Auto-tracks page visits. Fires once per session per page.
(function() {
  const path = location.pathname.replace(/\/$/, "") || "/";
  const map = {
    "/": "home",
    "/releases": "releases",
    "/events": "events",
    "/shop": "shop",
    "/shop/success": "shop-success",
    "/contact": "contact",
    "/plugins": "plugins",
    "/plugins/success": "plugins-success",
    "/breakeven": "breakeven",
    "/55asky": "55asky",
    "/data": "data",
    "/stats": "stats",
  };
  const page = map[path] || path.replace(/^\//, "").replace(/[^a-z0-9\-]/gi, "-") || "unknown";
  const key = "arch-tracked:" + page;
  if (sessionStorage.getItem(key) === "1") return;
  sessionStorage.setItem(key, "1");
  fetch("/api/v2/track-visit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ page }),
  }).catch(() => {});
})();
