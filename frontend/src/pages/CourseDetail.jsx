import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { api, DEMO_COURSES } from "../api.js";

export default function CourseDetail() {
  const { id } = useParams();
  const [course, setCourse] = useState(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    let alive = true;
    api
      .getCourse(id)
      .then((c) => alive && setCourse(c))
      .catch(() => {
        const demo = DEMO_COURSES.find((d) => d.id === id) || DEMO_COURSES[0];
        if (alive) {
          setCourse(demo);
          setErr(true);
        }
      });
    return () => {
      alive = false;
    };
  }, [id]);

  if (!course) {
    return (
      <div className="detail shell">
        <div className="skeleton" style={{ height: 320 }} />
      </div>
    );
  }

  return (
    <section className="detail shell">
      <Link to="/" className="back">
        ← Quay lại danh mục
      </Link>

      {err && (
        <div className="banner">
          ⚠︎ Không lấy được từ backend — hiển thị dữ liệu mẫu.
        </div>
      )}

      <div className="detail-grid">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <span className="eyebrow">{course.category || "General"}</span>
          <h1>{course.title}</h1>
          <p className="lede">
            {course.description ||
              "Khóa học này chưa có mô tả chi tiết — nội dung đang được giảng viên cập nhật."}
          </p>

          <div style={{ marginTop: "2.5rem", display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
            {["Bài giảng video", "Quiz thực hành", "Chứng chỉ hoàn thành", "Truy cập trọn đời"].map(
              (f) => (
                <span className="level" key={f} style={{ marginTop: 0 }}>
                  {f}
                </span>
              )
            )}
          </div>
        </motion.div>

        <motion.aside
          className="detail-panel"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15 }}
        >
          <div className="panel-price">${course.price ?? 0}</div>
          <div style={{ height: "1.2rem" }} />
          <div className="panel-row">
            <span>Giảng viên</span>
            <b>{course.instructor || "—"}</b>
          </div>
          <div className="panel-row">
            <span>Trình độ</span>
            <b>{course.level || "Beginner"}</b>
          </div>
          <div className="panel-row">
            <span>Thời lượng</span>
            <b>{course.durationHours ? `${course.durationHours} giờ` : "—"}</b>
          </div>
          <div className="panel-row">
            <span>Mã khóa</span>
            <b style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem" }}>
              {String(course.id).slice(0, 8)}
            </b>
          </div>
          <button className="btn-enroll">Đăng ký học ngay</button>
        </motion.aside>
      </div>
    </section>
  );
}
