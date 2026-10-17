// Runs the chat-api Lambda behind a plain Node HTTP server for local testing.
// Usage: put OPENROUTER_API_KEY=... in backend/.env, then npm run dev:chat
// POST http://localhost:3002/ with {"messages": [{"role": "user", "content": "..."}]}
import { createServer } from 'node:http';
import type { LambdaFunctionURLEvent } from 'aws-lambda';
import { handleChat } from '../amplify/functions/chat-api/handler';
import { openRouterSender } from '../amplify/functions/chat-api/bot';

const port = Number(process.env.CHAT_PORT ?? 3002);

createServer(async (req, res) => {
  // The deployed Function URL adds CORS headers itself; mirror that here for a local frontend.
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Access-Control-Allow-Headers': 'content-type',
  };
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  const event = {
    requestContext: { http: { method: req.method ?? 'POST' } },
    body: Buffer.concat(chunks).toString('utf8'),
    isBase64Encoded: false,
  } as LambdaFunctionURLEvent;

  const result = await handleChat(event, () => {
    const apiKey = process.env.OPENROUTER_API_KEY;
    return apiKey ? openRouterSender(apiKey) : null;
  });
  res.writeHead(result.statusCode ?? 200, { ...cors, ...(result.headers as Record<string, string>) });
  res.end(result.body);
}).listen(port, () => console.log(`Chat API listening on http://localhost:${port}`));
