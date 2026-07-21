import client from "prom-client";

// Registry + default metrics (CPU, heap, event loop...).
export const register = new client.Registry();
register.setDefaultLabels({ service: "course-service" });
client.collectDefaultMetrics({ register });

// Histogram thời gian xử lý request -> RPS, error rate, p50/p95/p99.
const httpDuration = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "Thời gian xử lý HTTP request (giây)",
  labelNames: ["method", "route", "status"],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [register],
});

// Middleware đo mọi request (trừ /metrics).
export function metricsMiddleware(req, res, next) {
  if (req.path === "/metrics") return next();
  const end = httpDuration.startTimer();
  res.on("finish", () => {
    const route = (req.route && req.route.path) || req.path || "unknown";
    end({ method: req.method, route, status: res.statusCode });
  });
  next();
}

// Endpoint để Prometheus scrape.
export async function metricsHandler(_req, res) {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
}
