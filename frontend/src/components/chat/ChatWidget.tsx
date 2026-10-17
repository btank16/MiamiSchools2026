import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react'
import { Loader2, MessageCircle, RotateCcw, Send, X } from 'lucide-react'
import { ChatError, describeToolCall, sendChat, type ChatMessage, type ToolCall } from '@/lib/chat'
import { cn } from '@/lib/utils'

// Floating School Finder chat: a round button in the bottom-right corner that opens a chat panel.
// It owns the bottom-right corner; the map's zoom buttons stack above it (see index.css).

const WELCOME =
  'Hi! I can help you find schools and early learning programs in Miami-Dade County, from infant care to grade 12. ' +
  'Tell me a zip code, city or school name, the grade, and the kind of school you want.'

const SUGGESTIONS = [
  'Which public high schools are near zip code 33186?',
  'I need infant care in Hialeah. What Early Head Start sites are there?',
  '¿Qué escuelas charter K-8 hay en Doral?',
]

type Entry = ChatMessage & { toolCalls?: ToolCall[] }

export function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [entries, setEntries] = useState<Entry[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const logRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const launcherRef = useRef<HTMLButtonElement>(null)
  const pending = useRef<AbortController | null>(null)

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight })
  }, [entries, busy, error])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  useEffect(() => () => pending.current?.abort(), [])

  const close = () => {
    setOpen(false)
    launcherRef.current?.focus()
  }

  const ask = async (text: string) => {
    const question = text.trim()
    if (!question || busy) return
    const history: ChatMessage[] = [...entries.map(({ role, content }) => ({ role, content })), { role: 'user', content: question }]
    setEntries((e) => [...e, { role: 'user', content: question }])
    setInput('')
    setError(null)
    setBusy(true)
    const controller = new AbortController()
    pending.current = controller
    try {
      const { reply, toolCalls } = await sendChat(history, controller.signal)
      setEntries((e) => [...e, { role: 'assistant', content: reply, toolCalls }])
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
      // Drop the unanswered question so the next request is a valid conversation, and offer it back.
      setEntries((e) => e.slice(0, -1))
      setInput(question)
      setError(err instanceof ChatError ? err.message : 'Something went wrong. Please try again.')
    } finally {
      if (pending.current === controller) pending.current = null
      setBusy(false)
      inputRef.current?.focus()
    }
  }

  const reset = () => {
    pending.current?.abort()
    setEntries([])
    setError(null)
    setBusy(false)
    setInput('')
    inputRef.current?.focus()
  }

  return (
    <>
      {open && (
        <section
          role="dialog"
          aria-label="School Finder chat"
          onKeyDown={(e) => e.key === 'Escape' && close()}
          className="fixed inset-x-4 bottom-[84px] top-[80px] z-50 flex flex-col overflow-hidden rounded-2xl border border-line bg-white text-ink shadow-[0_16px_48px_rgb(2,44,59,0.25)] sm:inset-x-auto sm:right-5 sm:top-auto sm:h-[min(580px,calc(100vh-120px))] sm:w-[380px]"
        >
          <header className="flex items-center gap-2 bg-deep py-3 pl-4 pr-2 text-white">
            <div className="min-w-0 flex-1">
              <h2 className="text-[15px] font-semibold">School Finder</h2>
              <p className="text-xs text-white/70">Miami-Dade schools, infant to grade 12</p>
            </div>
            <button type="button" onClick={reset} className="flex items-center gap-1 rounded-md border border-white/25 px-2.5 py-1 text-[13px] hover:bg-white/10">
              <RotateCcw className="size-3.5" aria-hidden /> New chat
            </button>
            <button type="button" onClick={close} aria-label="Close chat" className="grid size-8 place-items-center rounded-md hover:bg-white/10">
              <X className="size-5" aria-hidden />
            </button>
          </header>

          <div ref={logRef} aria-live="polite" className="flex flex-1 flex-col gap-2.5 overflow-y-auto bg-bar px-3 py-3.5 text-[15px] leading-normal">
            <Bubble role="assistant">{WELCOME}</Bubble>
            {entries.length === 0 && !busy && (
              <div className="flex flex-col items-start gap-1.5">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => ask(s)}
                    className="rounded-full border border-line bg-white px-3 py-1 text-left text-[13px] text-brand hover:border-brand"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
            {entries.map((entry, i) => (
              <Fragment key={i}>
                {entry.toolCalls && entry.toolCalls.length > 0 && (
                  <p className="-mb-1.5 text-xs text-ink/60">{entry.toolCalls.map(describeToolCall).join(' · ')}</p>
                )}
                <Bubble role={entry.role}>{entry.role === 'assistant' ? <Markdown text={entry.content} /> : entry.content}</Bubble>
              </Fragment>
            ))}
            {busy && (
              <p className="flex items-center gap-2 self-start text-sm italic text-ink/60">
                <Loader2 className="size-4 animate-spin" aria-hidden /> Looking that up… this can take up to a minute.
              </p>
            )}
            {error && <p role="alert" className="self-start text-[13px] text-[#be2323]">{error}</p>}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              ask(input)
            }}
            className="flex gap-2 border-t border-line bg-white px-3 pb-1 pt-2.5"
          >
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              maxLength={2000}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  ask(input)
                }
              }}
              placeholder="Ask about schools…"
              aria-label="Your question"
              className="max-h-28 min-h-10 flex-1 resize-none rounded-lg border border-line px-2.5 py-2 text-[15px] outline-none focus-visible:ring-2 focus-visible:ring-brand"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              aria-label="Send"
              className="grid w-11 place-items-center rounded-lg bg-brand text-white hover:bg-[#17439a] disabled:opacity-50"
            >
              <Send className="size-4" aria-hidden />
            </button>
          </form>
          <p className="bg-white px-3 pb-2.5 text-[11px] text-ink/60">Answers can be out of date. Confirm details with the school.</p>
        </section>
      )}

      <button
        ref={launcherRef}
        type="button"
        onClick={() => (open ? close() : setOpen(true))}
        aria-expanded={open}
        aria-label={open ? 'Close School Finder chat' : 'Chat with School Finder'}
        className="fixed bottom-5 right-5 z-50 grid size-14 place-items-center rounded-full bg-brand text-white shadow-[0_6px_20px_rgb(2,44,59,0.28)] transition hover:-translate-y-px hover:bg-[#17439a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        {open ? <X className="size-6" aria-hidden /> : <MessageCircle className="size-6" aria-hidden />}
      </button>
    </>
  )
}

function Bubble({ role, children }: { role: ChatMessage['role']; children: ReactNode }) {
  return (
    <div
      className={cn(
        'max-w-[92%] rounded-xl px-3 py-2 [overflow-wrap:anywhere]',
        role === 'user' ? 'self-end whitespace-pre-wrap rounded-br-sm bg-brand text-white' : 'self-start rounded-bl-sm border border-line bg-white',
      )}
    >
      {children}
    </div>
  )
}

// --- Minimal markdown: paragraphs, bullet and numbered lists, headings, bold, italics, links. ---
// Builds React elements rather than HTML, so nothing the model writes can inject markup.

function Markdown({ text }: { text: string }) {
  const blocks: ReactNode[] = []
  let list: { ordered: boolean; items: string[] } | null = null
  let para: string[] = []
  const flushPara = () => {
    if (para.length) blocks.push(<p key={blocks.length} className="mb-1.5 last:mb-0">{joinLines(para)}</p>)
    para = []
  }
  const flushList = () => {
    if (!list) return
    const items = list.items.map((item, i) => <li key={i} className="my-0.5">{joinLines(item.split('\n'))}</li>)
    blocks.push(
      list.ordered
        ? <ol key={blocks.length} className="mb-1.5 list-decimal pl-5 last:mb-0">{items}</ol>
        : <ul key={blocks.length} className="mb-1.5 list-disc pl-5 last:mb-0">{items}</ul>,
    )
    list = null
  }
  for (const raw of text.split('\n')) {
    const line = raw.trimEnd()
    const bullet = line.match(/^\s*[-*•]\s+(.*)$/)
    const numbered = line.match(/^\s*\d+[.)]\s+(.*)$/)
    const heading = line.match(/^#{1,6}\s+(.*)$/)
    if (bullet || numbered) {
      flushPara()
      const ordered = !bullet
      if (!list || list.ordered !== ordered) {
        flushList()
        list = { ordered, items: [] }
      }
      list.items.push((bullet ?? numbered)![1])
    } else if (heading) {
      flushPara()
      flushList()
      blocks.push(<h3 key={blocks.length} className="mb-0.5 mt-1.5 font-semibold">{inline(heading[1])}</h3>)
    } else if (!line.trim()) {
      flushPara()
      flushList()
    } else if (list && /^\s+\S/.test(raw)) {
      // An indented line continues the bullet above it.
      list.items[list.items.length - 1] += '\n' + line.trim()
    } else {
      flushList()
      para.push(line)
    }
  }
  flushPara()
  flushList()
  return <>{blocks}</>
}

function joinLines(lines: string[]): ReactNode[] {
  return lines.flatMap((l, i) => (i === 0 ? [inline(l, i)] : [<br key={`br${i}`} />, inline(l, i)]))
}

const INLINE = /\*\*(.+?)\*\*|\*([^*\s][^*]*?)\*|\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s<)]+)/g

function inline(text: string, key: number | string = 0): ReactNode {
  const out: ReactNode[] = []
  let last = 0
  for (const m of text.matchAll(INLINE)) {
    if (m.index > last) out.push(text.slice(last, m.index))
    const k = `${key}-${m.index}`
    if (m[1] !== undefined) out.push(<strong key={k}>{m[1]}</strong>)
    else if (m[2] !== undefined) out.push(<em key={k}>{m[2]}</em>)
    else {
      const href = m[4] ?? m[5]
      out.push(<a key={k} href={href} target="_blank" rel="noopener noreferrer" className="text-brand underline">{m[3] ?? m[5]}</a>)
    }
    last = m.index + m[0].length
  }
  if (last < text.length) out.push(text.slice(last))
  return <Fragment key={key}>{out}</Fragment>
}
