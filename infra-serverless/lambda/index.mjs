import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  ScanCommand,
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "node:crypto";
import { normalizeCourse } from "./validation.mjs";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE = process.env.TABLE_NAME;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
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
      const parsed = normalizeCourse(JSON.parse(event.body || "{}"));
      if (parsed.error) return resp(400, { error: parsed.error });
      const course = {
        id: randomUUID(),
        instructor: "unknown",
        price: 0,
        description: "",
        category: "General",
        level: "Beginner",
        durationHours: 0,
        ...parsed.course,
        createdAt: new Date().toISOString(),
      };
      await ddb.send(new PutCommand({ TableName: TABLE, Item: course }));
      return resp(201, course);
    }

    const m = path.match(/^\/courses\/([^/]+)$/);
    if (m) {
      const id = m[1];
      if (method === "GET") {
        const out = await ddb.send(new GetCommand({ TableName: TABLE, Key: { id } }));
        return out.Item ? resp(200, out.Item) : resp(404, { error: "Không tìm thấy khóa học" });
      }
      if (method === "PUT") {
        const parsed = normalizeCourse(JSON.parse(event.body || "{}"), { partial: true });
        if (parsed.error) return resp(400, { error: parsed.error });
        const fields = Object.keys(parsed.course);
        if (fields.length === 0) return resp(400, { error: "Không có trường nào để cập nhật" });
        parsed.course.updatedAt = new Date().toISOString();
        const names = {};
        const values = {};
        const sets = Object.keys(parsed.course).map((k) => {
          names[`#${k}`] = k;
          values[`:${k}`] = parsed.course[k];
          return `#${k} = :${k}`;
        });
        const out = await ddb.send(
          new UpdateCommand({
            TableName: TABLE,
            Key: { id },
            UpdateExpression: `SET ${sets.join(", ")}`,
            ConditionExpression: "attribute_exists(id)",
            ExpressionAttributeNames: names,
            ExpressionAttributeValues: values,
            ReturnValues: "ALL_NEW",
          })
        );
        return resp(200, out.Attributes);
      }
      if (method === "DELETE") {
        await ddb.send(
          new DeleteCommand({
            TableName: TABLE,
            Key: { id },
            ConditionExpression: "attribute_exists(id)",
          })
        );
        return resp(204, {});
      }
    }
    return resp(404, { error: "route not found" });
  } catch (e) {
    if (e.name === "ConditionalCheckFailedException")
      return resp(404, { error: "Không tìm thấy khóa học" });
    console.error(e);
    return resp(500, { error: "Internal error" });
  }
};
