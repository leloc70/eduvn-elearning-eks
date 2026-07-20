import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  ScanCommand,
  GetCommand,
  PutCommand,
} from "@aws-sdk/lib-dynamodb";

export const TABLE_NAME = process.env.TABLE_NAME || "";
const REGION = process.env.AWS_REGION || "ap-southeast-1";

// Trên EKS, credential lấy qua IRSA (không cần access key trong code).
export const ddb = new DynamoDBClient({ region: REGION });
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
