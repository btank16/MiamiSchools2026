import type { APIGatewayProxyStructuredResultV2, LambdaFunctionURLEvent } from 'aws-lambda';
import {
  ConnectionError,
  ForbiddenResponseError,
  OpenRouterError,
  PaymentRequiredResponseError,
  RequestTimeoutError,
  TooManyRequestsResponseError,
  UnauthorizedResponseError,
} from '@openrouter/sdk/models/errors';
import { answer, openRouterSender, type HistoryMessage, type SendChat } from './bot';
import type { School } from './schools';
import schoolsData from './schools.json';

// POST / with {"messages": [{"role": "user", "content": "..."}, ...]} -> {"reply": "...", "toolCalls": [...]}
// The browser keeps the conversation and sends it back each turn, so the function stays stateless.
// It runs behind a Lambda Function URL (see backend.ts), which handles CORS.

const schools = schoolsData as School[];

const MAX_MESSAGES = 30;
const MAX_USER_CHARS = 2000;
const MAX_ASSISTANT_CHARS = 8000;
const MAX_TOTAL_CHARS = 60_000;
const MAX_BODY_BYTES = 120_000;

class BadRequest extends Error {}

export const handler = async (event: LambdaFunctionURLEvent): Promise<APIGatewayProxyStructuredResultV2> =>
  handleChat(event, () => {
    const apiKey = process.env.OPENROUTER_API_KEY;
    return apiKey ? openRouterSender(apiKey) : null;
  });

/** The handler, with the model client injected so tests and the local dev server can swap it. */
export async function handleChat(event: LambdaFunctionURLEvent, makeSender: () => SendChat | null): Promise<APIGatewayProxyStructuredResultV2> {
  const method = event.requestContext?.http?.method ?? 'POST';
  if (method === 'OPTIONS') return respond(204, null);
  if (method !== 'POST') return respond(405, { error: 'Use POST' });

  let history: HistoryMessage[];
  try {
    history = parseHistory(event);
  } catch (err) {
    if (err instanceof BadRequest) return respond(400, { error: err.message });
    throw err;
  }

  const send = makeSender();
  if (!send) {
    console.error('OPENROUTER_API_KEY is not set (Amplify secret "openrouter")');
    return respond(500, { error: 'The chatbot is not set up with its OpenRouter key yet.' });
  }

  try {
    const result = await answer(history, schools, send);
    console.log(`Answered by ${result.models.join(', ')}`);
    return respond(200, { reply: result.reply, toolCalls: result.toolCalls });
  } catch (err) {
    logError(err);
    if (err instanceof TooManyRequestsResponseError) {
      return respond(429, { error: 'The free model is busy or its daily limit is used up. Please try again later.' });
    }
    if (err instanceof UnauthorizedResponseError) return respond(502, { error: 'OpenRouter rejected the chatbot\'s API key.' });
    if (err instanceof PaymentRequiredResponseError) return respond(502, { error: 'The OpenRouter account needs credits for this request.' });
    // e.g. OpenRouter restricting a free model to approved apps
    if (err instanceof ForbiddenResponseError) return respond(502, { error: 'OpenRouter isn\'t letting the chatbot use its AI model right now.' });
    if (err instanceof OpenRouterError) return respond(502, { error: 'The AI service had a problem. Please try again.' });
    if (err instanceof RequestTimeoutError) return respond(504, { error: 'The AI service took too long to answer. Please try again.' });
    if (err instanceof ConnectionError) return respond(503, { error: 'Couldn\'t reach the AI service. Please try again shortly.' });
    return respond(500, { error: 'Something went wrong. Please try again.' });
  }
}

function parseHistory(event: LambdaFunctionURLEvent): HistoryMessage[] {
  const raw = event.isBase64Encoded ? Buffer.from(event.body ?? '', 'base64').toString('utf8') : (event.body ?? '');
  if (Buffer.byteLength(raw) > MAX_BODY_BYTES) throw new BadRequest('This conversation is too long. Start a new chat.');
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    throw new BadRequest('Send JSON like {"messages": [{"role": "user", "content": "..."}]}');
  }
  const messages = (body as { messages?: unknown })?.messages;
  if (!Array.isArray(messages) || messages.length === 0) throw new BadRequest('messages must be a non-empty array');
  if (messages.length > MAX_MESSAGES) throw new BadRequest('This conversation is too long. Start a new chat.');

  let total = 0;
  const history = messages.map((m, i): HistoryMessage => {
    const role = (m as { role?: unknown })?.role;
    const content = (m as { content?: unknown })?.content;
    if (role !== 'user' && role !== 'assistant') throw new BadRequest(`messages[${i}].role must be "user" or "assistant"`);
    if (typeof content !== 'string' || !content.trim()) throw new BadRequest(`messages[${i}].content must be non-empty text`);
    const limit = role === 'user' ? MAX_USER_CHARS : MAX_ASSISTANT_CHARS;
    if (content.length > limit) throw new BadRequest(`messages[${i}] is longer than ${limit} characters`);
    total += content.length;
    return { role, content };
  });
  if (total > MAX_TOTAL_CHARS) throw new BadRequest('This conversation is too long. Start a new chat.');
  if (history[history.length - 1].role !== 'user') throw new BadRequest('The last message must be from the user');
  return history;
}

// SDK errors carry the raw request, Authorization header included, so never log the whole object.
function logError(err: unknown) {
  if (err instanceof OpenRouterError) console.error(`${err.name} (${err.statusCode}): ${err.message}`);
  else if (err instanceof Error) console.error(`${err.name}: ${err.message}`);
  else console.error('Unknown error', typeof err);
}

function respond(statusCode: number, body: unknown): APIGatewayProxyStructuredResultV2 {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    body: body === null ? '' : JSON.stringify(body),
  };
}
