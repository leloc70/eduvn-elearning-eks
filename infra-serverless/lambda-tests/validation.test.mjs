import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeCourse } from "../lambda/validation.mjs";

test("tạo mới: thiếu title -> lỗi", () => {
  assert.equal(normalizeCourse({}).error, "Thiếu 'title'");
});

test("tạo mới: title rỗng/space -> lỗi", () => {
  assert.equal(normalizeCourse({ title: "   " }).error, "'title' rỗng");
});

test("tạo mới: hợp lệ + trim title", () => {
  const { course, error } = normalizeCourse({ title: "  AWS EKS  ", price: 99 });
  assert.equal(error, undefined);
  assert.equal(course.title, "AWS EKS");
  assert.equal(course.price, 99);
});

test("price âm -> lỗi", () => {
  assert.equal(normalizeCourse({ title: "x", price: -5 }).error, "'price' không hợp lệ");
});

test("price không phải số -> lỗi", () => {
  assert.equal(normalizeCourse({ title: "x", price: "abc" }).error, "'price' không hợp lệ");
});

test("durationHours âm -> lỗi", () => {
  assert.equal(
    normalizeCourse({ title: "x", durationHours: -1 }).error,
    "'durationHours' không hợp lệ"
  );
});

test("level không hợp lệ -> lỗi", () => {
  assert.match(normalizeCourse({ title: "x", level: "Guru" }).error, /^'level' phải là/);
});

test("level hợp lệ được giữ", () => {
  assert.equal(normalizeCourse({ title: "x", level: "Advanced" }).course.level, "Advanced");
});

test("instructor rỗng -> mặc định 'unknown'", () => {
  assert.equal(normalizeCourse({ title: "x", instructor: "  " }).course.instructor, "unknown");
});

test("category rỗng -> mặc định 'General'", () => {
  assert.equal(normalizeCourse({ title: "x", category: "" }).course.category, "General");
});

test("partial update: không cần title", () => {
  const { course, error } = normalizeCourse({ price: 10 }, { partial: true });
  assert.equal(error, undefined);
  assert.deepEqual(course, { price: 10 });
});

test("partial update: chỉ chuẩn hoá field có mặt (không thêm field thừa)", () => {
  const { course } = normalizeCourse({ title: "Mới" }, { partial: true });
  assert.deepEqual(course, { title: "Mới" });
});

test("partial update: title rỗng vẫn bị chặn", () => {
  assert.equal(normalizeCourse({ title: "" }, { partial: true }).error, "'title' rỗng");
});
