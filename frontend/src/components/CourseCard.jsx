import { Link } from "react-router-dom";
import { motion } from "framer-motion";

export default function CourseCard({ course, index }) {
  const num = String(index + 1).padStart(2, "0");
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
    >
      <Link to={`/course/${course.id}`} className="card">
        <span className="arrow" aria-hidden>
          ↗
        </span>
        <div className="card-top">
          <span className="card-idx">№ {num}</span>
          <span className="card-cat">{course.category || "General"}</span>
        </div>
        <h3>{course.title}</h3>
        {course.description && <p className="card-desc">{course.description}</p>}
        <span className="level">{course.level || "Beginner"}</span>
        <div className="card-foot">
          <div className="card-meta">
            <b>{course.instructor || "—"}</b>
            <br />
            {course.durationHours ? `${course.durationHours} giờ học` : "Đang cập nhật"}
          </div>
          <div className="card-price">
            ${course.price ?? 0}
            <small>USD</small>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
