/**
 * Smoke-Lasttest Storefront + kritische öffentliche Endpunkte (Epic 9 / Hardening).
 * Voraussetzung: k6 installiert (https://k6.io/docs/get-started/installation/).
 *
 * Staging: BASE_URL=https://example.com k6 run scripts/load/k6-smoke.js
 * Lokal:   next start, dann: BASE_URL=http://127.0.0.1:3001 npm run load:k6
 *
 * Hinweis: PayPal-Webhook ohne gültige Signatur muss 4xx/503 liefern (kein 5xx-Storm).
 * Echte Captures gehören nicht in diesen Smoke.
 */
import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  vus: 5,
  duration: "30s",
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<3000"],
  },
};

const BASE = __ENV.BASE_URL || "http://127.0.0.1:3001";

export default function () {
  const home = http.get(`${BASE}/`);
  check(home, { "GET / status 200": (r) => r.status === 200 });
  sleep(0.3);

  const products = http.get(`${BASE}/produkte`);
  check(products, { "GET /produkte status 200": (r) => r.status === 200 });
  sleep(0.3);

  const cart = http.get(`${BASE}/warenkorb`);
  check(cart, { "GET /warenkorb erreichbar": (r) => r.status === 200 || r.status === 304 });
  sleep(0.2);

  // Unsignierter Webhook: kontrollierte Ablehnung (zählt nicht als http_req_failed)
  const webhook = http.post(`${BASE}/api/webhooks/paypal`, "{}", {
    headers: { "Content-Type": "application/json" },
    responseCallback: http.expectedStatuses(400, 401, 503),
  });
  check(webhook, {
    "POST /api/webhooks/paypal ohne Signatur kein 5xx": (r) =>
      r.status === 400 || r.status === 401 || r.status === 503,
  });
  sleep(0.5);
}
