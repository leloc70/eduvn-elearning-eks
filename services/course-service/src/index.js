import express from "express";
import { randomUUID } from "node:crypto";
import {
  ddb,
  TABLE_NAME,
  listCourses,
  getCourse,
  putCourse,
} from "./db.js";
import { metricsMiddleware, metricsHandler } from "./metrics.js";

const app = express();
app.use(express.json());
app.use(metricsMiddleware);
app.get("/metrics", metricsHandler);

// CORS: cho phép frontend (origin khác) gọi API.
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", process.env.CORS_ORIGIN || "*");
  res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

const PORT = process.env.PORT || 8080;

const LEVELS = ["Beginner", "Intermediate", "Advanced"];

// --- Health checks (khớp livenessProbe/readinessProbe trong Helm chart) ---
app.get("/healthz", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.get("/readyz", async (_req, res) => {
  // Ready khi kết nối được DynamoDB (nếu có cấu hình). Không có bảng -> vẫn ready cho demo.
  if (!TABLE_NAME) return res.status(200).json({ status: "ready", db: "not-configured" });
  try {
    await ddb.config.credentials();
    res.status(200).json({ status: "ready", db: "connected" });
  } catch (err) {
    res.status(503).json({ status: "not-ready", error: err.message });
  }
});

// --- API khóa học ---
app.get("/courses", async (_req, res, next) => {
  try {
    const items = await listCourses();
    res.json(items);
  } catch (err) {
    next(err);
  }
});

app.get("/courses/:id", async (req, res, next) => {
  try {
    const item = await getCourse(req.params.id);
    if (!item) return res.status(404).json({ error: "Không tìm thấy khóa học" });
    res.json(item);
  } catch (err) {
    next(err);
  }
});

app.post("/courses", async (req, res, next) => {
  try {
    const { title, instructor, price, description, category, level, durationHours } =
      req.body || {};
    if (!title) return res.status(400).json({ error: "Thiếu 'title'" });

    const course = {
      id: randomUUID(),
      title,
      instructor: instructor || "unknown",
      price: Number(price) || 0,
      description: description || "",
      category: category || "General",
      level: LEVELS.includes(level) ? level : "Beginner",
      durationHours: Number(durationHours) || 0,
      createdAt: new Date().toISOString(),
    };
    await putCourse(course);
    res.status(201).json(course);
  } catch (err) {
    next(err);
  }
});

// --- Error handler ---
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Internal error" });
});

app.listen(PORT, () => {
  console.log(`course-service đang chạy trên cổng ${PORT} (table=${TABLE_NAME || "none"})`);
});
