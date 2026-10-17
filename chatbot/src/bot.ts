import Anthropic from "@anthropic-ai/sdk";
import { loadSchools, type School } from "./schools.ts";
import { runTool, toolDefinitions } from "./tools.ts";

export const MODEL = process.env.CHATBOT_MODEL ?? "claude-opus-5-5";
const MAX_TOOL_ROUNDS = 8;

const SYSTEM_PROMPT = `You are the Miami-Dade School Finder, a friendly assistant that helps families find schools and early learning programs in Miami-Dade County, Florida, from infant care through grade 12.

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

export type ChatReply = {
  text: string;
  toolCalls: { name: string; input: unknown }[];
  stopReason: string | null;
  servedBy: string;
};

let cachedSchools: School[] | undefined;
export function schools(): School[] {
  cachedSchools ??= loadSchools();
  return cachedSchools;
}

/**
 * One conversation. History is append-only: each turn adds the user message, every assistant
 * response exactly as returned (thinking and fallback blocks included), and the tool results.
 * Earlier messages are never edited, which keeps thinking blocks valid and the prompt cache warm.
 */
export class ChatSession {
  readonly messages: Anthropic.Beta.BetaMessageParam[] = [];
  lastActive = Date.now();

  constructor(private readonly client: Anthropic = new Anthropic()) {}

  async send(userText: string): Promise<ChatReply> {
    this.lastActive = Date.now();
    const turnStart = this.messages.length;
    this.messages.push({ role: "user", content: userText });
    const toolCalls: ChatReply["toolCalls"] = [];

    try {
      for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
        const response = await this.client.beta.messages.create({
          model: MODEL,
          max_tokens: 16000,
          // On a safety decline the API re-runs the request on Anthropic's recommended fallback model.
          betas: ["server-side-fallback-2026-07-01"],
          fallbacks: "default",
          output_config: { effort: "medium" },
          cache_control: { type: "ephemeral" },
          system: SYSTEM_PROMPT,
          tools: toolDefinitions,
          messages: this.messages,
        });

        if (response.stop_reason === "refusal") {
          // Nothing usable came back. Drop this turn so the conversation can carry on.
          this.messages.length = turnStart;
          return {
            text: "Sorry, I can't help with that one. I can help you find schools and early learning programs in Miami-Dade.",
            toolCalls, stopReason: response.stop_reason, servedBy: response.model,
          };
        }

        if (response.content.length > 0) {
          this.messages.push({ role: "assistant", content: response.content });
        }

        const toolUses = response.content.filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use");

        if (response.stop_reason === "tool_use" && toolUses.length > 0) {
          if (round === MAX_TOOL_ROUNDS) break;
          const results: Anthropic.Beta.BetaToolResultBlockParam[] = toolUses.map((use) => {
            toolCalls.push({ name: use.name, input: use.input });
            const outcome = runTool(schools(), use.name, use.input);
            return { type: "tool_result", tool_use_id: use.id, content: outcome.content, is_error: outcome.isError };
          });
          // All results for one assistant turn go back in a single user message.
          this.messages.push({ role: "user", content: results });
          continue;
        }

        if (response.stop_reason === "pause_turn") continue;

        if (response.stop_reason === "max_tokens" && toolUses.length > 0) {
          // A tool call cut off mid-input can't be run or answered, so drop the turn.
          this.messages.length = turnStart;
          return {
            text: "Sorry, that answer got too long. Could you ask a narrower question?",
            toolCalls, stopReason: response.stop_reason, servedBy: response.model,
          };
        }

        let text = response.content
          .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
          .map((b) => b.text)
          .join("\n\n")
          .trim();
        if (response.stop_reason === "max_tokens") text += "\n\n(My answer was cut off. Ask me to continue.)";
        return { text: text || "Sorry, I didn't get an answer. Please try again.", toolCalls, stopReason: response.stop_reason, servedBy: response.model };
      }
    } catch (err) {
      // A failed request leaves no assistant reply; drop the turn so the history stays valid.
      this.messages.length = turnStart;
      throw err;
    }

    // Too many tool rounds. The last assistant message asks for tools that never ran, so drop the turn.
    this.messages.length = turnStart;
    return {
      text: "That search needed more steps than I can take at once. Could you narrow it down, for example by zip code, grade or type of school?",
      toolCalls, stopReason: "tool_rounds_exceeded", servedBy: MODEL,
    };
  }
}

/** A user-facing message for an API error. Most specific class first. */
export function describeApiError(err: unknown): { status: number; message: string } {
  if (err instanceof Anthropic.AuthenticationError) {
    return { status: 500, message: "The chatbot isn't set up with a valid Anthropic API key yet." };
  }
  if (err instanceof Anthropic.PermissionDeniedError) {
    return { status: 500, message: "The chatbot's API key isn't allowed to use this model." };
  }
  if (err instanceof Anthropic.RateLimitError) {
    return { status: 429, message: "Lots of people are asking right now. Please try again in a minute." };
  }
  if (err instanceof Anthropic.BadRequestError) {
    return { status: 500, message: "Something went wrong with that request. Please start a new chat." };
  }
  if (err instanceof Anthropic.APIConnectionError) {
    return { status: 503, message: "I couldn't reach the AI service. Please try again shortly." };
  }
  if (err instanceof Anthropic.APIError) {
    return { status: 502, message: "The AI service had a problem. Please try again." };
  }
  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
    // The SDK throws a plain Error before sending anything when it finds no credentials.
    return { status: 500, message: "The chatbot isn't connected to Claude yet. Set ANTHROPIC_API_KEY and restart the server." };
  }
  return { status: 500, message: "Something went wrong. Please try again." };
}
