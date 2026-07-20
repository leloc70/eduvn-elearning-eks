import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { api } from "../api.js";

const CATEGORIES = ["Cloud", "DevOps", "IaC", "Security", "Data", "General"];
const LEVELS = ["Beginner", "Intermediate", "Advanced"];

export default function CreateCourse() {
  const nav = useNavigate();
  const [form, setForm] = useState({
    title: "",
    instructor: "",
    category: "Cloud",
    level: "Beginner",
    durationHours: "",
    price: "",
    description: "",
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    if (!form.title.trim()) return setErr("Vui lòng nhập tên khóa học.");
    setBusy(true);
    setErr("");
    try {
      const created = await api.createCourse({
        ...form,
        price: Number(form.price) || 0,
        durationHours: Number(form.durationHours) || 0,
      });
      nav(`/course/${created.id}`);
    } catch {
      setErr(
        "Không kết nối được backend (course-service). Kiểm tra API đang chạy ở " +
          api.base
      );
      setBusy(false);
    }
  }

  return (
    <section className="section shell">
      <Link to="/" className="back">
        ← Quay lại danh mục
      </Link>

      <motion.div
        className="form-wrap"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        <span className="eyebrow">Dành cho giảng viên</span>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(2rem,5vw,3.4rem)", margin: "1rem 0 2.4rem", letterSpacing: "-0.02em", fontWeight: 400 }}>
          Xuất bản một <em style={{ color: "var(--vermilion)", fontStyle: "italic" }}>khóa học</em> mới
        </h2>

        {err && <div className="banner">⚠︎ {err}</div>}

        <form onSubmit={submit}>
          <div className="field title">
            <label>Tên khóa học *</label>
            <input
              value={form.title}
              onChange={set("title")}
              placeholder="VD: Kiến trúc EKS cho Customer Delivery"
              autoFocus
            />
          </div>

          <div className="form-row">
            <div className="field">
              <label>Giảng viên</label>
              <input value={form.instructor} onChange={set("instructor")} placeholder="Tên của bạn" />
            </div>
            <div className="field">
              <label>Danh mục</label>
              <select value={form.category} onChange={set("category")}>
                {CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="field">
              <label>Trình độ</label>
              <select value={form.level} onChange={set("level")}>
                {LEVELS.map((l) => (
                  <option key={l}>{l}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Thời lượng (giờ)</label>
              <input type="number" min="0" value={form.durationHours} onChange={set("durationHours")} placeholder="18" />
            </div>
          </div>

          <div className="field">
            <label>Giá (USD)</label>
            <input type="number" min="0" value={form.price} onChange={set("price")} placeholder="99" />
          </div>

          <div className="field">
            <label>Mô tả</label>
            <textarea
              value={form.description}
              onChange={set("description")}
              placeholder="Học viên sẽ học được gì trong khóa này?"
            />
          </div>

          <div className="form-actions">
            <button type="submit" className="btn-primary" disabled={busy}>
              {busy ? "Đang xuất bản…" : "Xuất bản khóa học"}
            </button>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem", color: "var(--ink-faint)" }}>
              POST → {api.base}/courses
            </span>
          </div>
        </form>
      </motion.div>
    </section>
  );
}
