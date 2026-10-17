// Runs the existing frontend with the School Finder chat button added, without editing the frontend.
//
// It loads frontend/vite.config.ts as is, then:
//   - adds a <script> tag for the chat widget to the page as it is served or built
//   - in dev, forwards /chatbot/* to the chatbot server, so the widget and its API share the app's origin
//
// Dev:   npm run app            (from chatbot/; starts the chatbot server and this Vite config together)
// Build: CHATBOT_PUBLIC_URL=https://chat.example.org npm run app:build   (output in chatbot/dist-app)
//        The built page loads the widget from CHATBOT_PUBLIC_URL, so that server must list the
//        app's origin in CHATBOT_ALLOWED_ORIGINS.

import path from "node:path";
import { fileURLToPath } from "node:url";
import frontendConfig from "../frontend/vite.config.ts";

const here = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(here, "../frontend");
const chatbotServer = process.env.CHATBOT_URL ?? `http://127.0.0.1:${process.env.PORT ?? 8787}`;

function chatWidget(src) {
  return {
    name: "school-finder-chat-widget",
    transformIndexHtml: {
      // "post" runs after Vite has processed the page's own scripts, so the widget isn't bundled into the app.
      order: "post",
      handler: () => [{ tag: "script", attrs: { type: "module", src }, injectTo: "body" }],
    },
  };
}

export default async (env) => {
  const base = typeof frontendConfig === "function" ? await frontendConfig(env) : frontendConfig;

  let widgetSrc = "/chatbot/widget.js";
  if (env.command === "build") {
    const publicUrl = process.env.CHATBOT_PUBLIC_URL;
    if (!publicUrl) {
      throw new Error("Set CHATBOT_PUBLIC_URL to where the chatbot server is hosted, e.g. https://chat.example.org");
    }
    widgetSrc = new URL("widget.js", publicUrl.endsWith("/") ? publicUrl : `${publicUrl}/`).href;
  }

  return {
    ...base,
    root: frontendRoot,
    plugins: [...(base.plugins ?? []), chatWidget(widgetSrc)],
    server: {
      ...base.server,
      proxy: {
        ...base.server?.proxy,
        "/chatbot": {
          target: chatbotServer,
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/chatbot/, "") || "/",
        },
      },
    },
    build: {
      ...base.build,
      // Keep build output out of the frontend folder.
      outDir: path.resolve(here, "dist-app"),
      emptyOutDir: true,
    },
  };
};
