// Runs the Lambda handler behind a plain Node HTTP server for local testing.
// Usage: GREATSCHOOLS_API_KEY=... npm run dev   (or put it in backend/.env)
import { createServer } from 'node:http';
import type { APIGatewayProxyEvent } from 'aws-lambda';
import { handler } from '../amplify/functions/schools-api/handler';

const port = Number(process.env.PORT ?? 3001);

createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:${port}`);
  const event = {
    httpMethod: req.method ?? 'GET',
    path: url.pathname,
    queryStringParameters: url.searchParams.size ? Object.fromEntries(url.searchParams) : null,
  } as APIGatewayProxyEvent;

  const result = await handler(event);
  res.writeHead(result.statusCode, result.headers as Record<string, string>);
  res.end(result.isBase64Encoded ? Buffer.from(result.body, 'base64') : result.body);
}).listen(port, () => console.log(`Schools API listening on http://localhost:${port}`));
