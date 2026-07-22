import http from "k6/http";
import { check } from "k6";

// SOAK test: tải vừa phải, KÉO DÀI -> phát hiện rò rỉ (memory/fd/connection) và
// suy giảm hiệu năng theo thời gian. Prod nên chạy 2–8h; lab rút gọn (BASE giữ nguyên,
// đổi DURATION qua env nếu muốn dài hơn).
export const options = {
  scenarios: {
    soak: {
      executor: "constant-vus",
      vus: Number(__ENV.VUS || 40),
      duration: __ENV.DURATION || "6m",
    },
  },
  thresholds: {
    http_req_duration: ["p(95)<500"],
    http_req_failed: ["rate<0.01"],
  },
};

const BASE = __ENV.BASE || "http://course-service.eduvn.svc.cluster.local";
export default function () {
  const r = http.get(`${BASE}/courses`);
  check(r, { "status 200": (res) => res.status === 200 });
}
