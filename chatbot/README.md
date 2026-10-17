# Miami-Dade School Finder chatbot

A chatbot that answers questions about Miami-Dade schools, infant through grade 12.
It reads `../school-data/schools.csv` (1,677 public, charter, private, Head Start and Early Head Start schools) and uses Claude to talk with families.

This folder is self-contained. It doesn't use or change the `frontend` or `backend` apps.

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
| `public/index.html` | The chat page, styled with the palette in `../colors.md`. |

Claude never sees the whole CSV. It searches it through the tools, so every school it names comes from the data.

"Near" searches work from a zip code, a school, or coordinates. A zip code's location is the average position of the schools in it. The bot can't look up street addresses.

Each conversation's history is kept in server memory and only ever appended to. Conversations are dropped after an hour idle, and the server keeps at most 500.

If Claude declines a request for safety reasons, the API automatically retries it on Anthropic's recommended fallback model. This uses the `server-side-fallback-2026-07-01` beta with `fallbacks: "default"`.

## Limits

The bot tells families what the data doesn't cover: ratings and state grades, tuition, enrollment, open seats, attendance zones, bus routes and licensed daycare centers.
The private school list includes some schools that have probably closed, and about 10 recently opened charter schools are missing. See `../school-data/README.md` for details.
