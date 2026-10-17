# chat-api

The School Finder chatbot as an Amplify function. It answers questions about 1,677 Miami-Dade schools, infant through grade 12, using the free Thinking Machines Inkling model (`thinkingmachines/inkling:free`) through OpenRouter.

The model never sees the whole list. It calls two tools, `search_schools` and `count_schools`, that search `schools.json`, so every school it names comes from the data.

## Setup

The function reads the OpenRouter key from the Amplify secret `openrouter`.

- **Deployed branches:** set the secret in the Amplify console under Hosting, then Secrets.
- **Sandbox:** run `npx ampx sandbox secret set openrouter`.
- **Local:** put `OPENROUTER_API_KEY=...` in `backend/.env`, then run `npm run dev:chat`. It listens on http://localhost:3002.

## API

The function has its own Lambda Function URL rather than a route on the REST API. API Gateway stops requests at 29 seconds, and a thinking model with a few tool rounds can take longer. The URL is written to `amplify_outputs.json` as `custom.chat.endpoint`.

```http
POST <custom.chat.endpoint>
Content-Type: application/json

{"messages": [{"role": "user", "content": "Public high schools near 33186?"}]}
```

```json
{"reply": "Here are 4 public high schools within 3 miles of 33186: ...", "toolCalls": [{"name": "search_schools", "input": {"types": ["Public"], "grade": "9", "near": {"zip": "33186"}}}]}
```

The function keeps no state. The browser sends the whole conversation each turn, with earlier bot replies as `assistant` messages. The last message must be from the user.

Limits per request: 30 messages, 2,000 characters per user message, 8,000 per bot reply. Errors come back as `{"error": "..."}` with a 4xx or 5xx status. A 429 means the free model is busy or its daily limit is used up.

## Files

| File | What it does |
|---|---|
| `handler.ts` | Validates the request, calls the bot, and maps OpenRouter errors to responses. |
| `bot.ts` | The system prompt, the model name, and the loop that runs tool calls. |
| `tools.ts` | The two tools, with inputs checked by Zod. |
| `schools.ts` | Grade parsing and the search filters. |
| `schools.json` | The school list, generated from `school-data/schools.csv`. Regenerate it with `npm run build:chat-data`. |
| `chat.test.ts` | Tests, run with `npm test`. They fake the model, so they need no key. |
