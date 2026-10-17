import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import Anthropic from "@anthropic-ai/sdk";
import { ChatSession, MODEL, describeApiError, schools } from "./bot.ts";

// Serves the chat page at /, the pop-up widget at /widget.js, and the chat API at POST /api/chat.

const here = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.resolve(here, "../public");
const STATIC_FILES: Record<string, { file: string; type: string }> = {
  "/": { file: "index.html", type: "text/html; charset=utf-8" },
  "/widget.js": { file: "widget.js", type: "text/javascript; charset=utf-8" },
  "/shared.js": { file: "shared.js", type: "text/javascript; charset=utf-8" },
};
// Sites allowed to load the widget from another origin, e.g. "https://schools.example.org".
// The Vite dev setup proxies the chatbot under the app's own origin, so it needs none.
const ALLOWED_ORIGINS = new Set(
  (process.env.CHATBOT_ALLOWED_ORIGINS ?? "").split(",").map((o) => o.trim()).filter(Boolean),
);
const PORT = Number(process.env.PORT ?? 8787);
const HOST = process.env.HOST ?? "127.0.0.1";
const MAX_MESSAGE_CHARS = 2000;
const MAX_BODY_BYTES = 16_000;
const MAX_SESSIONS = 500;
const SESSION_IDLE_MS = 60 * 60 * 1000;
const MAX_TURNS_PER_SESSION = 40;

const client = new Anthropic();
const sessions = new Map<string, ChatSession>();

function getSession(id: unknown): { id: string; session: ChatSession } {
  if (typeof id === "string" && sessions.has(id)) return { id, session: sessions.get(id)! };
  // Forget idle conversations, then the oldest, so memory stays bounded.
  const now = Date.now();
  for (const [key, s] of sessions) if (now - s.lastActive > SESSION_IDLE_MS) sessions.delete(key);
  while (sessions.size >= MAX_SESSIONS) sessions.delete(sessions.keys().next().value!);
  const newId = randomUUID();
  const session = new ChatSession(client);
  sessions.set(newId, session);
  return { id: newId, session };
}

function send(res: http.ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  res.end(JSON.stringify(body));
}

async function readJson(req: http.IncomingMessage): Promise<Record<string, unknown>> {
  let size = 0;
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw new Error("too large");
    chunks.push(chunk);
  }
  const value = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error("not an object");
  return value;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");

  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.setHeader("access-control-allow-origin", origin);
    res.setHeader("vary", "Origin");
  }
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "access-control-allow-methods": "GET, POST, OPTIONS",
      "access-control-allow-headers": "content-type",
      "access-control-max-age": "600",
    });
    res.end();
    return;
  }

  const asset = STATIC_FILES[url.pathname];
  if (req.method === "GET" && asset) {
    res.writeHead(200, { "content-type": asset.type, "cache-control": "no-cache" });
    fs.createReadStream(path.join(PUBLIC_DIR, asset.file)).pipe(res);
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/health") {
    return send(res, 200, { ok: true, schools: schools().length, model: MODEL });
  }

  if (req.method === "POST" && url.pathname === "/api/chat") {
    let body: Record<string, unknown>;
    try {
      body = await readJson(req);
    } catch {
      return send(res, 400, { error: "Send JSON like {\"message\": \"...\"}." });
    }
    const message = typeof body.message === "string" ? body.message.trim() : "";
    if (!message) return send(res, 400, { error: "Type a question first." });
    if (message.length > MAX_MESSAGE_CHARS) return send(res, 400, { error: `Please keep questions under ${MAX_MESSAGE_CHARS} characters.` });

    const { id, session } = getSession(body.sessionId);
    if (session.messages.filter((m) => m.role === "user" && typeof m.content === "string").length >= MAX_TURNS_PER_SESSION) {
      return send(res, 400, { error: "This chat is getting long. Start a new chat to keep going.", sessionId: id });
    }
    try {
      const reply = await session.send(message);
      return send(res, 200, { sessionId: id, reply: reply.text, toolCalls: reply.toolCalls });
    } catch (err) {
      const { status, message: text } = describeApiError(err);
      console.error("chat failed:", err);
      return send(res, status, { error: text, sessionId: id });
    }
  }

  if (req.method === "POST" && url.pathname === "/api/reset") {
    try {
      const body = await readJson(req);
      if (typeof body.sessionId === "string") sessions.delete(body.sessionId);
    } catch {
      // Nothing to reset.
    }
    return send(res, 200, { ok: true });
  }

  send(res, 404, { error: "Not found" });
});

console.log(`Loaded ${schools().length} schools.`);
if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
  console.warn("ANTHROPIC_API_KEY is not set. Chat requests will fail unless an `ant auth login` profile is active.");
}
server.listen(PORT, HOST, () => {
  console.log(`Miami-Dade School Finder running at http://${HOST}:${PORT} (model ${MODEL})`);
});
