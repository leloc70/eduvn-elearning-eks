import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { api, DEMO_COURSES } from "../api.js";
import CourseCard from "../components/CourseCard.jsx";

const TICKER = [
  "Cloud Architecture",
  "Kubernetes",
  "GitOps",
  "Terraform",
  "Serverless",
  "Observability",
  "Cost Optimization",
];

export default function Catalog() {
  const [courses, setCourses] = useState(null);
  const [demo, setDemo] = useState(false);
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("Tất cả");

  useEffect(() => {
    let alive = true;
    api
      .listCourses()
      .then((data) => {
        if (!alive) return;
        setCourses(data.length ? data : DEMO_COURSES);
        setDemo(data.length === 0);
      })
      .catch(() => {
        if (!alive) return;
        setCourses(DEMO_COURSES);
        setDemo(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  // Lọc client-side theo từ khóa + danh mục.
  const categories = courses
    ? ["Tất cả", ...new Set(courses.map((c) => c.category || "General"))]
    : ["Tất cả"];
  const filtered = (courses || []).filter((c) => {
    const okCat = cat === "Tất cả" || (c.category || "General") === cat;
    const q = query.trim().toLowerCase();
    const okQ =
      !q ||
      [c.title, c.instructor, c.description]
        .filter(Boolean)
        .some((f) => f.toLowerCase().includes(q));
    return okCat && okQ;
  });

  return (
    <>
      <header className="hero shell">
        <div className="hero-grid">
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            Tri thức <br />
            <em>được rèn</em> <br />
            <span className="out">bằng thực chiến.</span>
          </motion.h1>
          <motion.div
            className="hero-side"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <span className="eyebrow">Học viện EduVN</span>
            <p>
              Các khóa học kỹ thuật do người làm nghề thật xây dựng — từ kiến trúc
              cloud tới vận hành hệ thống ở quy mô lớn.
            </p>
            <div className="hero-stats">
              <div>
                <div className="n">{courses ? courses.length : "—"}</div>
                <div className="l">Khóa học</div>
              </div>
              <div>
                <div className="n">50k</div>
                <div className="l">Học viên</div>
              </div>
              <div>
                <div className="n">4.9</div>
                <div className="l">Đánh giá</div>
              </div>
            </div>
          </motion.div>
        </div>
      </header>

      <div className="ticker">
        <div className="ticker-track">
          {[...TICKER, ...TICKER].map((t, i) => (
            <span key={i}>{t}</span>
          ))}
        </div>
      </div>

      <section className="section shell" id="curriculum">
        <div className="sec-head">
          <h2>Danh mục khóa học</h2>
          <span className="count">
            {courses ? `${filtered.length}/${courses.length} khóa` : "đang tải…"}
          </span>
        </div>

        {courses && (
          <div className="catalog-tools">
            <input
              className="search"
              type="search"
              placeholder="Tìm khóa học, giảng viên…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <div className="cat-chips">
              {categories.map((c) => (
                <button
                  key={c}
                  className={"chip" + (c === cat ? " active" : "")}
                  onClick={() => setCat(c)}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}

        {demo && (
          <div className="banner">
            ⚠︎ Backend chưa có dữ liệu — đang hiển thị khóa học mẫu. Chạy
            course-service (localhost:8080) để thấy dữ liệu thật.
          </div>
        )}

        {!courses ? (
          <div className="grid">
            {Array.from({ length: 3 }).map((_, i) => (
              <div className="skeleton" key={i} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty">
            <h3>{courses.length === 0 ? "Chưa có khóa học nào" : "Không tìm thấy"}</h3>
            <p>
              {courses.length === 0
                ? "Hãy là người đầu tiên tạo một khóa học."
                : "Thử từ khóa khác hoặc chọn danh mục “Tất cả”."}
            </p>
          </div>
        ) : (
          <div className="grid">
            {filtered.map((c, i) => (
              <CourseCard course={c} index={i} key={c.id} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
