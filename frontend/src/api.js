const BASE = import.meta.env.VITE_API_URL || "http://localhost:8080";

// Dữ liệu mẫu để UI vẫn đẹp khi backend chưa chạy (demo mode).
export const DEMO_COURSES = [
  {
    id: "demo-1",
    title: "Kiến trúc AWS cho Customer Delivery",
    instructor: "Le Loc",
    price: 99,
    category: "Cloud",
    level: "Advanced",
    durationHours: 18,
    description:
      "Thiết kế hệ thống EKS production-grade: IRSA, GitOps, CI/CD OIDC và tối ưu chi phí như một dự án khách hàng thật.",
    createdAt: new Date().toISOString(),
  },
  {
    id: "demo-2",
    title: "Kubernetes từ số 0 đến vận hành",
    instructor: "Mai Anh",
    price: 79,
    category: "DevOps",
    level: "Intermediate",
    durationHours: 24,
    description:
      "Pod, Service, Ingress, Helm, autoscaling và cách chẩn đoán sự cố cluster dưới áp lực.",
    createdAt: new Date().toISOString(),
  },
  {
    id: "demo-3",
    title: "Terraform & Infrastructure as Code",
    instructor: "Quang Huy",
    price: 69,
    category: "IaC",
    level: "Beginner",
    durationHours: 12,
    description:
      "Viết hạ tầng tái lập được, remote state, module và quy trình plan/apply an toàn.",
    createdAt: new Date().toISOString(),
  },
];

async function req(path, options) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  base: BASE,
  listCourses: () => req("/courses"),
  getCourse: (id) => req(`/courses/${id}`),
  createCourse: (data) =>
    req("/courses", { method: "POST", body: JSON.stringify(data) }),
  updateCourse: (id, data) =>
    req(`/courses/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteCourse: (id) => req(`/courses/${id}`, { method: "DELETE" }),
};
