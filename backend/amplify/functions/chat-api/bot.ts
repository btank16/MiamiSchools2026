// The chatbot: a system prompt, the school-search tools, and the loop that runs them,
// using free models through OpenRouter.
import { OpenRouter } from '@openrouter/sdk';
import type { ChatMessages, ChatRequest, ChatResult } from '@openrouter/sdk/models';
import type { School } from './schools';
import { runTool, toolDefinitions } from './tools';

// OpenRouter tries these in order, moving to the next when one errors (rate limit, outage).
// Free models share one daily request cap per account, so a used-up cap fails them all.
export const MODELS = ['google/gemma-4-31b-it:free', 'nvidia/nemotron-3-super-120b-a12b:free'];
const MAX_TOOL_ROUNDS = 6;
// Stop starting new model calls after this long, so the reply lands inside the Lambda timeout.
const TURN_BUDGET_MS = 90_000;

export const SYSTEM_PROMPT = `You are the Miami-Dade School Finder, a friendly assistant that helps families find schools and early learning programs in Miami-Dade County, Florida, from infant care through grade 12.

You answer from a list of 1,677 schools that you reach through the search_schools and count_schools tools:
- 358 public schools run by Miami-Dade County Public Schools
- 180 charter school campuses
- 949 private schools marked active by the county
- 86 Head Start and 104 Early Head Start sites (free programs for low-income families; Early Head Start serves infants and toddlers)

How to work:
- Look schools up with the tools before naming any. Never invent a school, address, phone number, grade span or website. If a tool returns nothing, say so and suggest a wider search.
- For a neighborhood (Brickell, Kendall, Little Havana, Westchester...), search near the zip code you are confident covers it, and tell the family which zip code you used. Ask for their zip code when you can't tell where they mean.
- For a street address, ask for the zip code, or search near a school they name. You can't look up street addresses.
- Use count_schools for "how many" questions.

What the data does not have, so say so rather than guess: state grades or test scores, ratings, tuition, enrollment, open seats, attendance zones (which public school an address is zoned for), bus routes, and licensed daycare centers. For zoning, point families to the district's school locator at dadeschools.net. The private school list can include schools that have closed, and about 10 charter schools that opened recently are missing. Suggest families confirm details with the school.

How to answer:
- Keep answers short and easy to scan. List schools as bullets with the name in bold, then type, grades, address, and phone or website when you have them. Show at most 8 schools unless asked for more, and mention how many more matched.
- Write in the language the family writes in. Many Miami families write in Spanish or Haitian Creole.
- Stay on schools and early learning in Miami-Dade. Politely steer other requests back.`;

/** A message in the conversation the browser keeps and sends back each turn. */
export type HistoryMessage = { role: 'user' | 'assistant'; content: string };

export type ChatReply = {
  reply: string;
  toolCalls: { name: string; input: unknown }[];
  finishReason: string | null;
  /** The models that answered, as OpenRouter reports them, so logs show when the backup was used. */
  models: string[];
};

/** Sends one non-streaming chat request. Swappable so tests can run without the network. */
export type SendChat = (request: ChatRequest) => Promise<ChatResult>;

export function openRouterSender(apiKey: string): SendChat {
  const client = new OpenRouter({ apiKey, appTitle: 'Miami-Dade School Finder', timeoutMs: 60_000 });
  return async (request) => {
    const result = await client.chat.send({ chatRequest: { ...request, stream: false } });
    if (!('choices' in result)) throw new Error('OpenRouter returned a stream for a non-streaming request');
    return result;
  };
}

function textOf(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => (part && typeof part === 'object' && 'text' in part && typeof part.text === 'string' ? part.text : ''))
      .join('');
  }
  return '';
}

function parseArgs(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

/** Answers the last user message in `history`, calling the school tools as often as the model needs. */
export async function answer(history: HistoryMessage[], schools: School[], send: SendChat, now = Date.now): Promise<ChatReply> {
  const started = now();
  const messages: ChatMessages[] = [{ role: 'system', content: SYSTEM_PROMPT }, ...history];
  const toolCalls: ChatReply['toolCalls'] = [];
  const models = new Set<string>();

  for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
    const result = await send({ models: MODELS, messages, tools: toolDefinitions, maxTokens: 8000 });
    models.add(result.model);
    const choice = result.choices[0];
    if (!choice) throw new Error('OpenRouter returned no choices');
    const message = choice.message;
    const calls = message.toolCalls ?? [];

    if (calls.length === 0) {
      let reply = textOf(message.content).trim();
      if (choice.finishReason === 'length') reply += '\n\n(My answer was cut off. Ask me to continue.)';
      if (!reply && message.refusal) reply = 'Sorry, I can\'t help with that one. I can help you find schools in Miami-Dade.';
      return { reply: reply || 'Sorry, I didn\'t get an answer. Please try again.', toolCalls, finishReason: choice.finishReason, models: [...models] };
    }

    if (round === MAX_TOOL_ROUNDS || now() - started > TURN_BUDGET_MS) break;

    // Send the assistant turn back as it came, including its reasoning, so the model keeps its train of thought.
    messages.push({
      role: 'assistant',
      content: message.content ?? null,
      toolCalls: calls,
      ...(message.reasoningDetails ? { reasoningDetails: message.reasoningDetails } : {}),
    });
    for (const call of calls) {
      toolCalls.push({ name: call.function.name, input: parseArgs(call.function.arguments) });
      const outcome = runTool(schools, call.function.name, call.function.arguments);
      messages.push({ role: 'tool', toolCallId: call.id, content: outcome.content });
    }
  }

  return {
    reply: 'That search needed more steps than I can take at once. Could you narrow it down, for example by zip code, grade or type of school?',
    toolCalls,
    finishReason: 'tool_rounds_exceeded',
    models: [...models],
  };
}
