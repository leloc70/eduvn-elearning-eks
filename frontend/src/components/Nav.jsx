import { NavLink, Link } from "react-router-dom";

export default function Nav() {
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
          <Link to="/new" className="btn-nav">
            Tạo khóa học
          </Link>
        </div>
      </div>
    </nav>
  );
}
