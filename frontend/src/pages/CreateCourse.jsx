import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { api } from "../api.js";

const CATEGORIES = ["Cloud", "DevOps", "IaC", "Security", "Data", "General"];
const LEVELS = ["Beginner", "Intermediate", "Advanced"];

const EMPTY = {
  title: "",
  instructor: "",
  category: "Cloud",
  level: "Beginner",
  durationHours: "",
  price: "",
  description: "",
};

export default function CreateCourse() {
  const nav = useNavigate();
  const { id } = useParams();
  const editing = Boolean(id);

  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(editing);
  const [err, setErr] = useState("");

  // Chế độ sửa: nạp dữ liệu khóa học hiện có.
  useEffect(() => {
    if (!editing) return;
    let alive = true;
    api
      .getCourse(id)
      .then((c) => {
        if (!alive) return;
        setForm({
          title: c.title || "",
          instructor: c.instructor || "",
          category: c.category || "Cloud",
          level: c.level || "Beginner",
          durationHours: c.durationHours ?? "",
          price: c.price ?? "",
          description: c.description || "",
        });
        setLoading(false);
      })
      .catch(() => {
        if (!alive) return;
        setErr("Không tải được khóa học để sửa.");
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [id, editing]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    if (!form.title.trim()) return setErr("Vui lòng nhập tên khóa học.");
    setBusy(true);
    setErr("");
    const payload = {
      ...form,
      price: Number(form.price) || 0,
      durationHours: Number(form.durationHours) || 0,
    };
    try {
      const saved = editing
        ? await api.updateCourse(id, payload)
        : await api.createCourse(payload);
      nav(`/course/${editing ? id : saved.id}`);
    } catch {
      setErr(
        "Không kết nối được backend (course-service). Kiểm tra API đang chạy ở " +
          api.base
      );
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="section shell">
        <div className="skeleton" style={{ height: 420 }} />
      </div>
    );
  }

  return (
    <section className="section shell">
      <Link to={editing ? `/course/${id}` : "/"} className="back">
        ← {editing ? "Quay lại khóa học" : "Quay lại danh mục"}
      </Link>

      <motion.div
        className="form-wrap"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        <span className="eyebrow">Dành cho giảng viên</span>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(2rem,5vw,3.4rem)", margin: "1rem 0 2.4rem", letterSpacing: "-0.02em", fontWeight: 400 }}>
          {editing ? (
            <>Chỉnh sửa <em style={{ color: "var(--vermilion)", fontStyle: "italic" }}>khóa học</em></>
          ) : (
            <>Xuất bản một <em style={{ color: "var(--vermilion)", fontStyle: "italic" }}>khóa học</em> mới</>
          )}
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
              {busy
                ? editing
                  ? "Đang lưu…"
                  : "Đang xuất bản…"
                : editing
                ? "Lưu thay đổi"
                : "Xuất bản khóa học"}
            </button>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem", color: "var(--ink-faint)" }}>
              {editing ? "PUT" : "POST"} → {api.base}/courses{editing ? `/${String(id).slice(0, 8)}…` : ""}
            </span>
          </div>
        </form>
      </motion.div>
    </section>
  );
}
