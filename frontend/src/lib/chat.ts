// Client for the chat-api backend function (backend/amplify/functions/chat-api/handler.ts).
import outputs from '../../../amplify_outputs.json'

export type ChatMessage = { role: 'user' | 'assistant'; content: string }
export type ToolCall = { name: string; input: unknown }
export type ChatReply = { reply: string; toolCalls: ToolCall[] }

// VITE_CHAT_URL points at a local chat server (`npm run dev:chat` in backend/, http://localhost:3002);
// otherwise use the Function URL that Amplify writes to amplify_outputs.json after a deploy.
const deployed = (outputs.custom as { chat?: { endpoint?: string } }).chat?.endpoint
export const CHAT_URL: string | undefined = import.meta.env.VITE_CHAT_URL || deployed || undefined

export class ChatError extends Error {}

/** Sends the whole conversation (ending with the user's new message) and returns the bot's reply. */
export async function sendChat(messages: ChatMessage[], signal?: AbortSignal): Promise<ChatReply> {
  if (!CHAT_URL) {
    throw new ChatError('The chatbot isn’t deployed yet. Deploy the backend, or set VITE_CHAT_URL for a local chat server.')
  }
  let res: Response
  try {
    res = await fetch(CHAT_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ messages }),
      signal,
    })
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err
    throw new ChatError('Couldn’t reach the chatbot. Check your connection and try again.')
  }
  const body = await res.json().catch(() => null)
  if (!res.ok) throw new ChatError(body?.error ?? `The chatbot had a problem (${res.status}). Please try again.`)
  return { reply: String(body?.reply ?? ''), toolCalls: Array.isArray(body?.toolCalls) ? body.toolCalls : [] }
}

/** A one-line summary of a tool call, e.g. "Searched Public · grade 9 · near 33186". */
export function describeToolCall(call: ToolCall): string {
  const i = (call.input && typeof call.input === 'object' ? call.input : {}) as Record<string, any>
  const bits: string[] = []
  if (Array.isArray(i.types) && i.types.length) bits.push(i.types.join(', '))
  if (i.grade) bits.push(`grade ${i.grade}`)
  if (i.name) bits.push(`“${i.name}”`)
  if (i.city) bits.push(String(i.city))
  if (i.zip) bits.push(String(i.zip))
  if (i.near) bits.push(`near ${i.near.zip ?? i.near.school ?? 'a point'}`)
  return (call.name === 'count_schools' ? 'Counted ' : 'Searched ') + (bits.join(' · ') || 'all schools')
}
