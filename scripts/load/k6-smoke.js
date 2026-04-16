/**
 * Smoke-Lasttest für Startseite + Produktliste (Epic 11).
 * Voraussetzung: k6 installiert (https://k6.io/docs/get-started/installation/).
 *
 * Staging: BASE_URL=https://example.com k6 run scripts/load/k6-smoke.js
 * Lokal:   next start auf Port 3000, dann: k6 run scripts/load/k6-smoke.js
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

const BASE = __ENV.BASE_URL || "http://127.0.0.1:3000";

export default function () {
  const home = http.get(`${BASE}/`);
  check(home, { "GET / status 200": (r) => r.status === 200 });
  sleep(0.3);

  const products = http.get(`${BASE}/produkte`);
  check(products, { "GET /produkte status 200": (r) => r.status === 200 });
  sleep(0.5);
}
