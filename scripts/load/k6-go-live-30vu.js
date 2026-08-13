/**
 * Go-Live Lasttest: bis 30 gleichzeitige Nutzer gegen Staging/Preview.
 *
 * BASE_URL=https://ecom-seven-livid.vercel.app k6 run scripts/load/k6-go-live-30vu.js
 *
 * Keine echten Captures / keine destruktiven Mutationen.
 */
import http from "k6/http";
import { check, sleep, group } from "k6";
import { Rate, Trend } from "k6/metrics";

const failRate = new Rate("custom_fail_rate");
const homeDuration = new Trend("page_home_ms", true);
const productsDuration = new Trend("page_products_ms", true);
const pdpDuration = new Trend("page_pdp_ms", true);
const cartDuration = new Trend("page_cart_ms", true);
const termineDuration = new Trend("page_termine_ms", true);
const suggestDuration = new Trend("api_suggest_ms", true);

export const options = {
  stages: [
    { duration: "30s", target: 10 },
    { duration: "45s", target: 20 },
    { duration: "45s", target: 30 },
    { duration: "60s", target: 30 },
    { duration: "30s", target: 0 },
  ],
  thresholds: {
    http_req_failed: ["rate<0.02"],
    http_req_duration: ["p(95)<4000", "p(99)<8000"],
    page_home_ms: ["p(95)<3500"],
    page_products_ms: ["p(95)<3500"],
    page_pdp_ms: ["p(95)<4000"],
    page_cart_ms: ["p(95)<3000"],
    page_termine_ms: ["p(95)<3500"],
    api_suggest_ms: ["p(95)<1500"],
    custom_fail_rate: ["rate<0.02"],
  },
};

const BASE = __ENV.BASE_URL || "https://ecom-seven-livid.vercel.app";

function okPage(res, name) {
  const ok = check(res, {
    [`${name} status 200`]: (r) => r.status === 200,
    [`${name} body not empty`]: (r) => (r.body || "").length > 500,
  });
  failRate.add(!ok);
  return ok;
}

export default function () {
  group("storefront browse", () => {
    const home = http.get(`${BASE}/`, { tags: { page: "home" } });
    homeDuration.add(home.timings.duration);
    okPage(home, "home");
    sleep(0.4 + Math.random() * 0.4);

    const products = http.get(`${BASE}/produkte`, { tags: { page: "products" } });
    productsDuration.add(products.timings.duration);
    okPage(products, "products");
    sleep(0.3 + Math.random() * 0.4);

    const pdp = http.get(`${BASE}/produkte/design-katzenhoehle`, { tags: { page: "pdp" } });
    pdpDuration.add(pdp.timings.duration);
    okPage(pdp, "pdp");
    sleep(0.3 + Math.random() * 0.5);

    const cart = http.get(`${BASE}/warenkorb`, { tags: { page: "cart" } });
    cartDuration.add(cart.timings.duration);
    okPage(cart, "cart");
    sleep(0.2 + Math.random() * 0.3);

    const termine = http.get(`${BASE}/termine`, { tags: { page: "termine" } });
    termineDuration.add(termine.timings.duration);
    okPage(termine, "termine");
    sleep(0.2 + Math.random() * 0.3);
  });

  group("public api", () => {
    const suggest = http.get(`${BASE}/api/storefront/product-suggest?q=katze`, {
      tags: { page: "suggest" },
    });
    suggestDuration.add(suggest.timings.duration);
    const ok = check(suggest, {
      "suggest status 200 or 429": (r) => r.status === 200 || r.status === 429,
      "suggest json": (r) =>
        r.status === 429 || String(r.body || "").includes("suggestions"),
    });
    failRate.add(!ok);
    sleep(0.2);
  });

  group("admin gated", () => {
    const admin = http.get(`${BASE}/admin`, { redirects: 0 });
    check(admin, {
      "admin redirects unauth": (r) => r.status === 307 || r.status === 302,
    });

    const search = http.get(`${BASE}/api/admin/search?q=test`);
    check(search, { "admin search 401": (r) => r.status === 401 });
    sleep(0.2);
  });
}
