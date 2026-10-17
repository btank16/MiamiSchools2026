// Starts the chatbot server and the frontend (with the chat button) together: npm run app
// Extra arguments go to Vite, e.g. npm run app -- --port 5174. Stop both with Ctrl+C.

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const chatbotDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const frontendDir = path.resolve(chatbotDir, "../frontend");
const bin = (dir, name) => path.join(dir, "node_modules", ".bin", process.platform === "win32" ? `${name}.cmd` : name);
const vite = bin(frontendDir, "vite");
const tsx = bin(chatbotDir, "tsx");
const shell = process.platform === "win32";

if (!fs.existsSync(vite)) {
  console.error("The frontend's packages aren't installed. Run this first:\n\n  cd frontend && npm ci\n");
  process.exit(1);
}

const children = [];
let stopping = false;

function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) if (child.exitCode === null) child.kill("SIGTERM");
  process.exitCode = code;
}

function start(command, args, cwd) {
  const child = spawn(command, args, { cwd, stdio: "inherit", shell });
  child.on("exit", (code) => stop(code ?? 0));
  children.push(child);
}

process.on("SIGINT", () => stop(0));
process.on("SIGTERM", () => stop(0));

start(tsx, ["src/server.ts"], chatbotDir);

// Start the app once the chatbot server answers, so the widget loads on the first page view.
const health = `http://127.0.0.1:${process.env.PORT ?? 8787}/api/health`;
for (let i = 0; i < 40 && !stopping; i++) {
  if (await fetch(health).then((r) => r.ok, () => false)) break;
  await new Promise((resolve) => setTimeout(resolve, 250));
}

if (!stopping) start(vite, ["--config", path.join(chatbotDir, "app.vite.config.mjs"), ...process.argv.slice(2)], frontendDir);
