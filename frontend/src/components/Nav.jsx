import { NavLink, Link } from "react-router-dom";
import { useTheme } from "../useTheme.js";

export default function Nav() {
  const [theme, toggle] = useTheme();
  return (
    <nav className="nav">
      <div className="nav-inner shell">
        <Link to="/" className="logo">
          EduVN<span className="dot">.</span>
          <span className="mark">Học viện</span>
        </Link>
        <div className="nav-links">
          <NavLink to="/" end className="hide-sm">
            Khóa học
          </NavLink>
          <a href="#curriculum" className="hide-sm">
            Chương trình
          </a>
          <button
            className="theme-toggle"
            onClick={toggle}
            aria-label="Đổi giao diện sáng/tối"
            title={theme === "light" ? "Chuyển tối" : "Chuyển sáng"}
          >
            {theme === "light" ? "☾" : "☀"}
          </button>
          <Link to="/new" className="btn-nav">
            Tạo khóa học
          </Link>
        </div>
      </div>
    </nav>
  );
}
