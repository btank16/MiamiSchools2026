// Shared by the full chat page (index.html) and the pop-up widget (widget.js).

export const SUGGESTIONS = [
  "Which public high schools are near zip code 33186?",
  "I need infant care in Hialeah. What Early Head Start sites are there?",
  "How many private schools are in Coral Gables?",
  "¿Qué escuelas charter K-8 hay en Doral?",
];

export const WELCOME =
  "Hi! I can help you find schools and early learning programs in Miami-Dade County, from infant care to grade 12. " +
  "Tell me a zip code, city or school name, the grade, and the kind of school you want.";

export function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

function inline(s) {
  return escapeHtml(s)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*\s][^*]*?)\*(?!\*)/g, "$1<em>$2</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    .replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g, '$1<a href="$2" target="_blank" rel="noopener noreferrer">$2</a>');
}

/** Minimal markdown: escape everything first, then add bold, italics, code, links, headings and lists. */
export function renderMarkdown(text) {
  const out = [];
  let list = null;
  let para = [];
  const flushPara = () => {
    if (para.length) {
      out.push("<p>" + para.map(inline).join("<br>") + "</p>");
      para = [];
    }
  };
  const closeList = () => {
    if (list) {
      out.push(`</${list}>`);
      list = null;
    }
  };
  for (const raw of text.split("\n")) {
    const line = raw.trimEnd();
    const bullet = line.match(/^\s*[-*•]\s+(.*)$/);
    const numbered = line.match(/^\s*\d+[.)]\s+(.*)$/);
    const heading = line.match(/^#{1,6}\s+(.*)$/);
    if (bullet || numbered) {
      flushPara();
      const kind = bullet ? "ul" : "ol";
      if (list !== kind) {
        closeList();
        out.push(`<${kind}>`);
        list = kind;
      }
      out.push("<li>" + inline((bullet || numbered)[1]) + "</li>");
    } else if (heading) {
      flushPara();
      closeList();
      out.push("<h3>" + inline(heading[1]) + "</h3>");
    } else if (!line.trim()) {
      flushPara();
      closeList();
    } else if (list && /^\s+\S/.test(raw)) {
      // An indented line continues the bullet above it.
      out[out.length - 1] = out[out.length - 1].replace(/<\/li>$/, "<br>" + inline(line.trim()) + "</li>");
    } else {
      closeList();
      para.push(line);
    }
  }
  flushPara();
  closeList();
  return out.join("");
}

/** A one-line summary of a tool call, e.g. "Searched Public · grade 9 · near 33186". */
export function describeCall(call) {
  const i = call.input || {};
  const bits = [];
  if (i.types?.length) bits.push(i.types.join(", "));
  if (i.grade) bits.push(`grade ${i.grade}`);
  if (i.name) bits.push(`"${i.name}"`);
  if (i.city) bits.push(i.city);
  if (i.zip) bits.push(i.zip);
  if (i.near) bits.push(`near ${i.near.zip || i.near.school || "a point"}`);
  return (call.name === "count_schools" ? "Counted " : "Searched ") + (bits.join(" · ") || "all schools");
}

/**
 * Talks to the chatbot server at `base` (a URL ending in "/").
 * send() resolves to {reply, toolCalls} or throws an Error whose message is safe to show.
 */
export function createChatClient(base) {
  let sessionId = null;
  return {
    async send(message) {
      let res;
      try {
        res = await fetch(new URL("api/chat", base), {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ sessionId, message }),
        });
      } catch {
        throw new Error("Couldn't reach the chatbot server. Is it running?");
      }
      const data = await res.json().catch(() => ({}));
      if (data.sessionId) sessionId = data.sessionId;
      if (!res.ok) throw new Error(data.error || "Something went wrong. Please try again.");
      return { reply: data.reply || "", toolCalls: data.toolCalls || [] };
    },
    reset() {
      if (sessionId) {
        fetch(new URL("api/reset", base), {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ sessionId }),
        }).catch(() => {});
      }
      sessionId = null;
    },
  };
}
