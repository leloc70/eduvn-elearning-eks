import http from "k6/http";
import { check } from "k6";

// Ramp tải để tìm trần thông lượng (mandate #19) + kích HPA scale (mandate #02/13).
export const options = {
  scenarios: {
    ramp: {
      executor: "ramping-vus",
      startVUs: 5,
      stages: [
        { duration: "30s", target: 30 },
        { duration: "30s", target: 60 },
        { duration: "30s", target: 120 },
        { duration: "40s", target: 200 },
        { duration: "20s", target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_duration: ["p(95)<500"], // SLO p95 < 500ms
    http_req_failed: ["rate<0.01"], // < 1% lỗi
  },
};

const BASE = __ENV.BASE || "http://course-service.eduvn.svc.cluster.local";

export default function () {
  const r = http.get(`${BASE}/courses`);
  check(r, { "status 200": (res) => res.status === 200 });
}
