import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  ScanCommand,
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";

export const TABLE_NAME = process.env.TABLE_NAME || "";
const REGION = process.env.AWS_REGION || "ap-southeast-1";

// Trên EKS, credential lấy qua IRSA (không cần access key trong code).
// Mandate #17: fail-fast + retry giới hạn -> DynamoDB chậm/lỗi không treo request.
export const ddb = new DynamoDBClient({
  region: REGION,
  maxAttempts: 3,
  requestHandler: { requestTimeout: 2000, connectionTimeout: 1000 },
});
const doc = DynamoDBDocumentClient.from(ddb);

// Fallback in-memory khi chưa cấu hình bảng (chạy local nhanh).
const memory = new Map();

export async function listCourses() {
  if (!TABLE_NAME) return [...memory.values()];
  const out = await doc.send(new ScanCommand({ TableName: TABLE_NAME }));
  return out.Items || [];
}

export async function getCourse(id) {
  if (!TABLE_NAME) return memory.get(id) || null;
  const out = await doc.send(new GetCommand({ TableName: TABLE_NAME, Key: { id } }));
  return out.Item || null;
}

export async function putCourse(course) {
  if (!TABLE_NAME) {
    memory.set(course.id, course);
    return course;
  }
  await doc.send(new PutCommand({ TableName: TABLE_NAME, Item: course }));
  return course;
}

// Cập nhật một phần. Trả bản ghi mới, hoặc null nếu id không tồn tại.
export async function updateCourse(id, fields) {
  const patch = { ...fields, updatedAt: new Date().toISOString() };
  if (!TABLE_NAME) {
    const cur = memory.get(id);
    if (!cur) return null;
    const next = { ...cur, ...patch };
    memory.set(id, next);
    return next;
  }
  const names = {};
  const values = {};
  const sets = Object.keys(patch).map((k) => {
    names[`#${k}`] = k;
    values[`:${k}`] = patch[k];
    return `#${k} = :${k}`;
  });
  try {
    const out = await doc.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { id },
        UpdateExpression: `SET ${sets.join(", ")}`,
        ConditionExpression: "attribute_exists(id)",
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values,
        ReturnValues: "ALL_NEW",
      })
    );
    return out.Attributes;
  } catch (err) {
    if (err.name === "ConditionalCheckFailedException") return null;
    throw err;
  }
}

// Xóa. Trả true nếu đã xóa, false nếu id không tồn tại.
export async function deleteCourse(id) {
  if (!TABLE_NAME) return memory.delete(id);
  try {
    await doc.send(
      new DeleteCommand({
        TableName: TABLE_NAME,
        Key: { id },
        ConditionExpression: "attribute_exists(id)",
      })
    );
    return true;
  } catch (err) {
    if (err.name === "ConditionalCheckFailedException") return false;
    throw err;
  }
}
