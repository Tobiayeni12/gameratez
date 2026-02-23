import { useState, useEffect } from 'react'
import type { UserProfile } from '../lib/profileStorage'
import { useErrorToast } from '../contexts/ErrorToastContext'
import { MessageIcon } from './icons'

type Conversation = {
  otherUsername: string
  lastMessage: { body: string; createdAt: string; fromMe: boolean } | null
  lastMessageAt: string | null
}

type Message = {
  id: string
  senderUsername: string
  receiverUsername: string
  body: string
  createdAt: string
}

function formatMessageTime(createdAt: string): string {
  const d = new Date(createdAt)
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  if (sameDay) return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

interface MessagesPageProps {
  profile: UserProfile
  /** When set, open this conversation on load (e.g. from Profile "Message") */
  initialWithUsername?: string | null
  /** Call when initial conversation has been applied */
  onClearInitialWith?: () => void
}

export function MessagesPage({ profile, initialWithUsername, onClearInitialWith }: MessagesPageProps) {
  const { showError } = useErrorToast()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [conversationsLoading, setConversationsLoading] = useState(true)
  const [selectedOther, setSelectedOther] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [sending, setSending] = useState(false)
  const [newMessageUsername, setNewMessageUsername] = useState('')
  const [showNewMessage, setShowNewMessage] = useState(false)
  const username = profile.username?.trim().toLowerCase()

  async function fetchConversations() {
    if (!username) {
      setConversations([])
      setConversationsLoading(false)
      return
    }
    setConversationsLoading(true)
    try {
      const res = await fetch(`/api/messages/conversations?username=${encodeURIComponent(profile.username!)}`)
      if (!res.ok) throw new Error('Failed to load conversations')
      const data = await res.json()
      setConversations(Array.isArray(data) ? data : [])
    } catch {
      setConversations([])
    } finally {
      setConversationsLoading(false)
    }
  }

  useEffect(() => {
    fetchConversations()
  }, [username])

  useEffect(() => {
    if (initialWithUsername?.trim()) {
      setSelectedOther(initialWithUsername.trim().toLowerCase())
      onClearInitialWith?.()
    }
  }, [initialWithUsername])

  useEffect(() => {
    if (!selectedOther || !username) {
      setMessages([])
      return
    }
    setMessagesLoading(true)
    fetch(`/api/messages?username=${encodeURIComponent(profile.username!)}&with=${encodeURIComponent(selectedOther)}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        setMessages(Array.isArray(data) ? data : [])
      })
      .catch(() => setMessages([]))
      .finally(() => setMessagesLoading(false))
  }, [selectedOther, username, profile.username])

  async function sendMessage(toUsername: string, body: string) {
    if (!username || !body.trim() || sending) return
    setSending(true)
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderUsername: profile.username,
          receiverUsername: toUsername,
          body: body.trim(),
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to send')
      }
      const msg: Message = await res.json()
      setMessages((prev) => [...prev, msg])
      setReplyText('')
      fetchConversations()
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Failed to send message')
    } finally {
      setSending(false)
    }
  }

  function startConversation(withUsername: string) {
    const w = withUsername.trim().replace(/^@/, '').toLowerCase()
    if (!w || w === username) return
    setSelectedOther(w)
    setNewMessageUsername('')
    setShowNewMessage(false)
  }

  if (!username) {
    return (
      <main className="flex min-h-[calc(100vh-80px)] flex-1 flex-col border-x border-surface-border bg-surface md:min-h-screen">
        <div className="sticky top-0 z-10 border-b border-surface-border bg-surface/95 py-4 pl-4 backdrop-blur">
          <h1 className="text-xl font-bold text-[var(--color-text)]">Messages</h1>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
          <MessageIcon className="h-12 w-12 text-[var(--color-text-muted)]" />
          <p className="max-w-[280px] text-sm text-[var(--color-text-muted)]">Sign in to see your messages.</p>
        </div>
      </main>
    )
  }

  return (
    <main className="flex min-h-[calc(100vh-80px)] flex-1 flex-col border-x border-surface-border bg-surface md:min-h-screen">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-surface-border bg-surface/95 px-4 py-4 backdrop-blur">
        <h1 className="text-xl font-bold text-[var(--color-text)]">Messages</h1>
        {!selectedOther && (
          <button
            type="button"
            onClick={() => setShowNewMessage(true)}
            className="rounded-full bg-gold-500 px-4 py-2 text-sm font-semibold text-black hover:bg-gold-400"
          >
            New message
          </button>
        )}
      </div>

      {showNewMessage && !selectedOther && (
        <div className="border-b border-surface-border p-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={newMessageUsername}
              onChange={(e) => setNewMessageUsername(e.target.value)}
              placeholder="Username (e.g. jane or @jane)"
              className="min-w-0 flex-1 rounded-full border border-surface-border bg-surface-hover px-4 py-2 text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:border-gold-500/50 focus:outline-none focus:ring-1 focus:ring-gold-500/50"
            />
            <button
              type="button"
              onClick={() => startConversation(newMessageUsername)}
              disabled={!newMessageUsername.trim()}
              className="shrink-0 rounded-full bg-gold-500 px-4 py-2 text-sm font-semibold text-black disabled:opacity-50 hover:enabled:bg-gold-400"
            >
              Start chat
            </button>
            <button
              type="button"
              onClick={() => { setShowNewMessage(false); setNewMessageUsername('') }}
              className="shrink-0 rounded-full border border-surface-border px-4 py-2 text-sm font-medium text-[var(--color-text-muted)] hover:bg-surface-hover"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-1 flex-col overflow-hidden md:flex-row">
        {/* Conversation list */}
        <div
          className={`flex w-full flex-col border-surface-border md:w-80 md:border-r ${selectedOther ? 'hidden md:flex' : ''}`}
        >
          {conversationsLoading ? (
            <p className="p-4 text-center text-sm text-[var(--color-text-muted)]">Loading…</p>
          ) : conversations.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
              <MessageIcon className="h-12 w-12 text-[var(--color-text-muted)]" />
              <p className="max-w-[260px] text-sm text-[var(--color-text-muted)]">
                No conversations yet. Start one with &quot;New message&quot;.
              </p>
            </div>
          ) : (
            <ul className="flex-1 overflow-y-auto">
              {conversations.map((c) => (
                <li key={c.otherUsername}>
                  <button
                    type="button"
                    onClick={() => setSelectedOther(c.otherUsername)}
                    className={`flex w-full flex-col gap-0.5 border-b border-surface-border px-4 py-3 text-left transition-colors hover:bg-surface-hover ${selectedOther === c.otherUsername ? 'bg-surface-hover' : ''}`}
                  >
                    <span className="font-semibold text-[var(--color-text)]">@{c.otherUsername}</span>
                    {c.lastMessage && (
                      <span className="truncate text-sm text-[var(--color-text-muted)]">
                        {c.lastMessage.fromMe ? 'You: ' : ''}{c.lastMessage.body}
                      </span>
                    )}
                    {c.lastMessageAt && (
                      <span className="text-xs text-[var(--color-text-muted)]">
                        {formatMessageTime(c.lastMessageAt)}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Thread */}
        <div className="flex flex-1 flex-col min-h-0">
          {selectedOther ? (
            <>
              <div className="flex items-center gap-2 border-b border-surface-border px-4 py-3">
                <button
                  type="button"
                  onClick={() => setSelectedOther(null)}
                  className="md:hidden text-gold-400 hover:underline"
                >
                  ← Back
                </button>
                <span className="font-semibold text-[var(--color-text)]">@{selectedOther}</span>
              </div>
              {messagesLoading ? (
                <p className="p-4 text-center text-sm text-[var(--color-text-muted)]">Loading…</p>
              ) : (
                <ul className="flex-1 overflow-y-auto space-y-2 p-4">
                  {messages.map((m) => {
                    const fromMe = (m.senderUsername || '').toLowerCase() === username
                    return (
                      <li
                        key={m.id}
                        className={`flex ${fromMe ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-2xl px-4 py-2 ${
                            fromMe ? 'bg-gold-500/20 text-[var(--color-text)]' : 'bg-surface-elevated text-[var(--color-text)]'
                          }`}
                        >
                          <p className="whitespace-pre-wrap text-[15px]">{m.body}</p>
                          <p className={`mt-1 text-xs ${fromMe ? 'text-gold-400' : 'text-[var(--color-text-muted)]'}`}>
                            {formatMessageTime(m.createdAt)}
                          </p>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
              <form
                className="border-t border-surface-border p-3"
                onSubmit={(e) => {
                  e.preventDefault()
                  sendMessage(selectedOther, replyText)
                }}
              >
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Message…"
                    className="min-w-0 flex-1 rounded-full border border-surface-border bg-surface-hover px-4 py-2.5 text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:border-gold-500/50 focus:outline-none focus:ring-1 focus:ring-gold-500/50"
                    disabled={sending}
                  />
                  <button
                    type="submit"
                    disabled={!replyText.trim() || sending}
                    className="shrink-0 rounded-full bg-gold-500 px-4 py-2.5 text-sm font-semibold text-black disabled:opacity-50 hover:enabled:bg-gold-400"
                  >
                    Send
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="hidden flex-1 flex-col items-center justify-center gap-3 p-8 text-center md:flex">
              <MessageIcon className="h-12 w-12 text-[var(--color-text-muted)]" />
              <p className="max-w-[260px] text-sm text-[var(--color-text-muted)]">
                Select a conversation or start a new message.
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
