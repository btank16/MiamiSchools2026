# Miami-Dade School Finder chatbot

A chatbot that answers questions about Miami-Dade schools, infant through grade 12.
It reads `../school-data/schools.csv` (1,677 public, charter, private, Head Start and Early Head Start schools) and uses Claude to talk with families.

Everything lives in this folder. It doesn't change any `frontend` or `backend` code.

## Run it

You need Node 22 or newer and an Anthropic API key.

```bash
cd chatbot
npm install
export ANTHROPIC_API_KEY=sk-ant-...   # or sign in once with `ant auth login`
npm start                              # web chat at http://127.0.0.1:8787
npm run chat                           # or chat in the terminal
```

`PORT` and `HOST` change where the server listens. `CHATBOT_MODEL` overrides the model, which defaults to `claude-opus-5-5`.

## Chat button in the School Navigator app

`npm run app` starts the existing frontend with a round chat button in the bottom-right corner, plus the chatbot server.
Click the button to open a chat panel over the page. The frontend and backend code are not changed.

```bash
cd frontend && npm ci && cd ..   # once, to install the frontend's packages
cd chatbot
export ANTHROPIC_API_KEY=sk-ant-...
npm run app                      # app at http://localhost:5173
```

How it attaches without editing the frontend:
- `app.vite.config.mjs` loads `frontend/vite.config.ts` unchanged and adds a `<script>` tag for `public/widget.js` to the page.
- In dev it forwards `/chatbot/*` to the chatbot server, so the widget and its API share the app's address.
- The widget draws inside a shadow root, so the app's styles and the widget's styles stay separate.

For a production build, the page loads the widget straight from the chatbot server:

```bash
CHATBOT_PUBLIC_URL=https://chat.example.org npm run app:build   # output in chatbot/dist-app
```

On that chatbot server, set `CHATBOT_ALLOWED_ORIGINS` to the app's address, e.g. `https://schools.example.org`, so the browser lets the app talk to it.
Any other site can show the button the same way, with `<script type="module" src="https://chat.example.org/widget.js"></script>`.

## Check it

```bash
npm run typecheck
npm test     # no API key needed; the chat loop is tested with a fake client
```

## How it works

| File | What it does |
|---|---|
| `src/schools.ts` | Loads the CSV, parses grade spans such as `PK-05` or `Infant-PK`, and filters by name, type, city, zip, grade and distance. |
| `src/tools.ts` | The two tools Claude can call: `search_schools` and `count_schools`. Inputs are checked with Zod before they run. |
| `src/bot.ts` | The system prompt and the chat loop. It calls Claude, runs the tools it asks for, and returns the answer. |
| `src/server.ts` | A small web server for the chat page and `POST /api/chat`. |
| `src/cli.ts` | The same chat in a terminal. |
| `public/index.html` | The full-page chat, styled with the palette in `../colors.md`. |
| `public/widget.js` | The pop-up chat button and panel for other pages. |
| `public/shared.js` | Message rendering and the API client, shared by the page and the widget. |
| `app.vite.config.mjs` | Runs or builds the frontend with the chat button added. |
| `scripts/dev-app.mjs` | Starts the chatbot server and the frontend together for `npm run app`. |

Claude never sees the whole CSV. It searches it through the tools, so every school it names comes from the data.

"Near" searches work from a zip code, a school, or coordinates. A zip code's location is the average position of the schools in it. The bot can't look up street addresses.

Each conversation's history is kept in server memory and only ever appended to. Conversations are dropped after an hour idle, and the server keeps at most 500.

If Claude declines a request for safety reasons, the API automatically retries it on Anthropic's recommended fallback model. This uses the `server-side-fallback-2026-07-01` beta with `fallbacks: "default"`.

## Limits

The bot tells families what the data doesn't cover: ratings and state grades, tuition, enrollment, open seats, attendance zones, bus routes and licensed daycare centers.
The private school list includes some schools that have probably closed, and about 10 recently opened charter schools are missing. See `../school-data/README.md` for details.
