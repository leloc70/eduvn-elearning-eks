import { Routes, Route } from "react-router-dom";
import Nav from "./components/Nav.jsx";
import Catalog from "./pages/Catalog.jsx";
import CourseDetail from "./pages/CourseDetail.jsx";
import CreateCourse from "./pages/CreateCourse.jsx";

export default function App() {
  return (
    <>
      <Nav />
      <main>
        <Routes>
          <Route path="/" element={<Catalog />} />
          <Route path="/course/:id" element={<CourseDetail />} />
          <Route path="/new" element={<CreateCourse />} />
          <Route path="/course/:id/edit" element={<CreateCourse />} />
        </Routes>
      </main>
      <footer className="footer shell">
        <span>EduVN — Học viện tri thức © 2026</span>
        <span>Dựng trên EKS · GitOps · IRSA</span>
      </footer>
    </>
  );
}
