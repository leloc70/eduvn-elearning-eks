// Validate + chuẩn hoá input khóa học. Tách riêng, KHÔNG import AWS SDK
// để unit test chạy được bằng `node --test` mà không cần cài dependency.
export const LEVELS = ["Beginner", "Intermediate", "Advanced"];

// partial=false: tạo mới (bắt buộc title). partial=true: cập nhật (chỉ field có mặt).
// Trả { course } khi hợp lệ, hoặc { error } khi không.
export function normalizeCourse(b, { partial = false } = {}) {
  if (!partial && !b.title) return { error: "Thiếu 'title'" };
  if (b.title !== undefined && String(b.title).trim() === "") return { error: "'title' rỗng" };
  if (b.price !== undefined && (isNaN(Number(b.price)) || Number(b.price) < 0))
    return { error: "'price' không hợp lệ" };
  if (b.durationHours !== undefined && (isNaN(Number(b.durationHours)) || Number(b.durationHours) < 0))
    return { error: "'durationHours' không hợp lệ" };
  if (b.level !== undefined && !LEVELS.includes(b.level))
    return { error: `'level' phải là ${LEVELS.join(" / ")}` };

  const c = {};
  if (b.title !== undefined) c.title = String(b.title).trim();
  if (b.instructor !== undefined) c.instructor = String(b.instructor).trim() || "unknown";
  if (b.price !== undefined) c.price = Number(b.price) || 0;
  if (b.description !== undefined) c.description = String(b.description);
  if (b.category !== undefined) c.category = String(b.category).trim() || "General";
  if (b.level !== undefined) c.level = b.level;
  if (b.durationHours !== undefined) c.durationHours = Number(b.durationHours) || 0;
  return { course: c };
}
