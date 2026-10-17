// Floating School Finder chat: a round button in the bottom-right corner that opens a chat panel.
// Load it on any page with <script type="module" src="<chatbot server>/widget.js"></script>.
// It talks to the chatbot server it was loaded from, and lives in a shadow root so the
// page's styles and its own never mix.

import { SUGGESTIONS, WELCOME, renderMarkdown, describeCall, createChatClient } from "./shared.js";

const BASE = new URL("./", import.meta.url);

const CSS = `
  :host { all: initial; }
  * { box-sizing: border-box; }
  .root {
    --primary: #2256BB; --primary-700: #17439A; --bay: #052739; --canvas: #FFFFFF;
    --subtle: #F9FAFD; --text: #060D1A; --muted: #5E636D; --border: #E5E8ED; --danger: #BE2323;
    font-family: "Geist Variable", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    font-size: 15px; line-height: 1.5; color: var(--text);
  }
  /* Sits left of the map's zoom buttons, which take the map's bottom-right corner. */
  .launcher {
    position: fixed; right: 64px; bottom: 20px; z-index: 2147483000;
    width: 56px; height: 56px; border-radius: 50%; border: 0; cursor: pointer;
    background: var(--primary); color: #fff; display: grid; place-items: center;
    box-shadow: 0 6px 20px rgb(5 39 57 / 28%);
    transition: transform .15s ease, background .15s ease;
  }
  .launcher:hover { background: var(--primary-700); transform: translateY(-1px); }
  .launcher:focus-visible, button:focus-visible, textarea:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
  .launcher svg { width: 26px; height: 26px; }
  .panel {
    position: fixed; right: 64px; bottom: 88px; z-index: 2147483000;
    width: min(380px, calc(100vw - 32px)); height: min(580px, calc(100vh - 120px));
    display: flex; flex-direction: column; overflow: hidden;
    background: var(--canvas); border: 1px solid var(--border); border-radius: 16px;
    box-shadow: 0 16px 48px rgb(5 39 57 / 25%);
  }
  .panel[hidden] { display: none; }
  @media (max-width: 520px) {
    .launcher { right: 16px; bottom: 16px; }
    .panel { right: 16px; left: 16px; bottom: 84px; width: auto; height: calc(100vh - 110px); }
  }
  header {
    background: var(--bay); color: #fff; padding: 12px 12px 12px 16px;
    display: flex; align-items: center; gap: 8px;
  }
  header .title { flex: 1; min-width: 0; }
  header h2 { margin: 0; font-size: 15px; font-weight: 650; }
  header p { margin: 0; font-size: 12px; color: #C9D6E2; }
  header button {
    background: transparent; color: #fff; border: 1px solid #ffffff40; border-radius: 8px;
    font: inherit; font-size: 13px; padding: 4px 10px; cursor: pointer;
  }
  header button.icon { border: 0; width: 32px; height: 32px; padding: 0; display: grid; place-items: center; }
  header button:hover { background: #ffffff1a; }
  .log { flex: 1; overflow-y: auto; background: var(--subtle); padding: 14px 12px; display: flex; flex-direction: column; gap: 10px; }
  .msg { max-width: 92%; padding: 8px 12px; border-radius: 12px; overflow-wrap: anywhere; }
  .user { align-self: flex-end; background: var(--primary); color: #fff; border-bottom-right-radius: 4px; white-space: pre-wrap; }
  .bot { align-self: flex-start; background: var(--canvas); border: 1px solid var(--border); border-bottom-left-radius: 4px; }
  .bot p { margin: 0 0 6px; } .bot p:last-child { margin-bottom: 0; }
  .bot ul, .bot ol { margin: 4px 0 6px; padding-left: 20px; } .bot li { margin: 3px 0; }
  .bot h3 { font-size: 15px; margin: 6px 0 2px; }
  .bot a { color: var(--primary); }
  .typing { color: var(--muted); font-style: italic; }
  .searched { align-self: flex-start; color: var(--muted); font-size: 12px; margin-bottom: -6px; }
  .error { align-self: flex-start; color: var(--danger); font-size: 13px; }
  .suggestions { display: flex; flex-direction: column; align-items: flex-start; gap: 6px; }
  .suggestions button {
    background: var(--canvas); color: var(--primary); border: 1px solid var(--border); border-radius: 999px;
    padding: 5px 12px; font: inherit; font-size: 13px; cursor: pointer; text-align: left;
  }
  .suggestions button:hover { border-color: var(--primary); }
  form { display: flex; gap: 8px; padding: 10px 12px 4px; border-top: 1px solid var(--border); background: var(--canvas); }
  textarea {
    flex: 1; resize: none; font: inherit; padding: 8px 10px; border: 1px solid var(--border); border-radius: 10px;
    min-height: 40px; max-height: 120px; color: var(--text); background: var(--canvas);
  }
  form button {
    background: var(--primary); color: #fff; border: 0; border-radius: 10px; padding: 0 14px;
    font: inherit; font-weight: 600; cursor: pointer;
  }
  form button:hover { background: var(--primary-700); }
  form button:disabled { opacity: .55; cursor: default; }
  .note { margin: 0; padding: 2px 12px 10px; font-size: 11px; color: var(--muted); background: var(--canvas); }
`;

const CHAT_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.9A8 8 0 1 1 21 12Z"/><path d="M8.5 11h.01M12 11h.01M15.5 11h.01"/></svg>`;
const CLOSE_ICON = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>`;

function mount() {
  if (document.getElementById("school-finder-chat")) return;
  const host = document.createElement("div");
  host.id = "school-finder-chat";
  document.body.appendChild(host);
  const shadow = host.attachShadow({ mode: "open" });
  shadow.innerHTML = `
    <style>${CSS}</style>
    <div class="root">
      <section class="panel" id="panel" role="dialog" aria-label="School Finder chat" hidden>
        <header>
          <div class="title">
            <h2>School Finder</h2>
            <p>Miami-Dade schools, infant to grade 12</p>
          </div>
          <button type="button" class="reset">New chat</button>
          <button type="button" class="icon close" aria-label="Close chat">${CLOSE_ICON}</button>
        </header>
        <div class="log" aria-live="polite"></div>
        <form>
          <textarea rows="1" placeholder="Ask about schools…" aria-label="Your question" maxlength="2000"></textarea>
          <button type="submit">Send</button>
        </form>
        <p class="note">Answers can be out of date. Confirm details with the school.</p>
      </section>
      <button type="button" class="launcher" aria-label="Chat with School Finder" aria-expanded="false" aria-controls="panel">${CHAT_ICON}</button>
    </div>`;

  const $ = (sel) => shadow.querySelector(sel);
  const panel = $(".panel");
  const launcher = $(".launcher");
  const log = $(".log");
  const form = $("form");
  const input = $("textarea");
  const sendBtn = $("form button");
  const chat = createChatClient(BASE);
  let busy = false;
  let started = false;

  function add(kind, content, html = false) {
    const el = document.createElement("div");
    el.className = kind === "error" || kind === "searched" ? kind : `msg ${kind}`;
    if (html) el.innerHTML = content;
    else el.textContent = content;
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
    return el;
  }

  function welcome() {
    log.innerHTML = "";
    add("bot", renderMarkdown(WELCOME), true);
    const box = document.createElement("div");
    box.className = "suggestions";
    for (const s of SUGGESTIONS.slice(0, 3)) {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = s;
      b.onclick = () => ask(s);
      box.appendChild(b);
    }
    log.appendChild(box);
  }

  async function ask(text) {
    if (busy || !text.trim()) return;
    busy = true;
    sendBtn.disabled = true;
    log.querySelector(".suggestions")?.remove();
    add("user", text);
    const typing = add("bot", "Looking that up…");
    typing.classList.add("typing");
    try {
      const { reply, toolCalls } = await chat.send(text);
      typing.remove();
      if (toolCalls.length) add("searched", toolCalls.map(describeCall).join(" · "));
      add("bot", renderMarkdown(reply), true);
    } catch (err) {
      typing.remove();
      add("error", err.message);
    } finally {
      busy = false;
      sendBtn.disabled = false;
      input.focus();
    }
  }

  function open() {
    if (!started) {
      welcome();
      started = true;
    }
    panel.hidden = false;
    launcher.setAttribute("aria-expanded", "true");
    launcher.setAttribute("aria-label", "Close School Finder chat");
    input.focus();
  }

  function close() {
    panel.hidden = true;
    launcher.setAttribute("aria-expanded", "false");
    launcher.setAttribute("aria-label", "Chat with School Finder");
    launcher.focus();
  }

  launcher.addEventListener("click", () => (panel.hidden ? open() : close()));
  $(".close").addEventListener("click", close);
  $(".reset").addEventListener("click", () => {
    chat.reset();
    welcome();
    input.focus();
  });
  panel.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
  });
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = input.value;
    input.value = "";
    input.style.height = "";
    ask(text);
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      form.requestSubmit();
    }
  });
  input.addEventListener("input", () => {
    input.style.height = "";
    input.style.height = input.scrollHeight + "px";
  });
}

if (document.body) mount();
else document.addEventListener("DOMContentLoaded", mount);
