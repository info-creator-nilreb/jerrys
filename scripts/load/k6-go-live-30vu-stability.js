/**
 * Stabilitäts-Lasttest: 30 VUs nur Lesepfade, ohne Auth-Probes (keine 401/307 als Fail).
 */
import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  stages: [
    { duration: "20s", target: 15 },
    { duration: "40s", target: 30 },
    { duration: "60s", target: 30 },
    { duration: "20s", target: 0 },
  ],
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<5000"],
    checks: ["rate>0.99"],
  },
};

const BASE = __ENV.BASE_URL || "https://ecom-seven-livid.vercel.app";
const PATHS = ["/", "/produkte", "/produkte/design-katzenhoehle", "/warenkorb", "/termine"];

export default function () {
  const path = PATHS[Math.floor(Math.random() * PATHS.length)];
  const res = http.get(`${BASE}${path}`);
  check(res, {
    "status 200": (r) => r.status === 200,
    "under 10s": (r) => r.timings.duration < 10000,
  });
  sleep(0.5 + Math.random());
}
