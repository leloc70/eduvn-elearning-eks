import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  ScanCommand,
  GetCommand,
  PutCommand,
} from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "node:crypto";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE = process.env.TABLE_NAME;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

const resp = (code, body) => ({ statusCode: code, headers: CORS, body: JSON.stringify(body) });

export const handler = async (event) => {
  const method = event.requestContext?.http?.method || "GET";
  const path = event.rawPath || "/";
  try {
    if (method === "OPTIONS") return { statusCode: 204, headers: CORS };
    if (path === "/healthz" || path === "/readyz") return resp(200, { status: "ok" });

    if (path === "/courses" && method === "GET") {
      const out = await ddb.send(new ScanCommand({ TableName: TABLE }));
      return resp(200, out.Items || []);
    }
    if (path === "/courses" && method === "POST") {
      const b = JSON.parse(event.body || "{}");
      if (!b.title) return resp(400, { error: "Thiếu 'title'" });
      const course = {
        id: randomUUID(),
        title: b.title,
        instructor: b.instructor || "unknown",
        price: Number(b.price) || 0,
        description: b.description || "",
        category: b.category || "General",
        level: ["Beginner", "Intermediate", "Advanced"].includes(b.level) ? b.level : "Beginner",
        durationHours: Number(b.durationHours) || 0,
        createdAt: new Date().toISOString(),
      };
      await ddb.send(new PutCommand({ TableName: TABLE, Item: course }));
      return resp(201, course);
    }
    const m = path.match(/^\/courses\/([^/]+)$/);
    if (m && method === "GET") {
      const out = await ddb.send(new GetCommand({ TableName: TABLE, Key: { id: m[1] } }));
      return out.Item ? resp(200, out.Item) : resp(404, { error: "Không tìm thấy khóa học" });
    }
    return resp(404, { error: "route not found" });
  } catch (e) {
    console.error(e);
    return resp(500, { error: "Internal error" });
  }
};
