import http from "k6/http";
import { check } from "k6";

// SPIKE test: tải nhảy vọt đột ngột (flash-sale) -> đo độ trễ tăng vọt + độ trễ
// phản ứng của HPA (pod mới cần thời gian Ready). Xem lỗi có xảy ra trong "khe" scale không.
export const options = {
  scenarios: {
    spike: {
      executor: "ramping-vus",
      startVUs: 5,
      stages: [
        { duration: "20s", target: 5 }, // nền
        { duration: "5s", target: 300 }, // NHẢY VỌT
        { duration: "45s", target: 300 }, // giữ đỉnh (chờ HPA đuổi kịp)
        { duration: "10s", target: 5 }, // rớt đột ngột
        { duration: "20s", target: 5 }, // hồi
      ],
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.02"], // cho phép <2% lỗi trong khe spike
  },
};

const BASE = __ENV.BASE || "http://course-service.eduvn.svc.cluster.local";
export default function () {
  const r = http.get(`${BASE}/courses`);
  check(r, { "status 200": (res) => res.status === 200 });
}
