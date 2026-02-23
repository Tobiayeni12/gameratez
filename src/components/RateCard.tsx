import { useEffect, useRef, useState } from 'react'
import { useErrorToast } from '../contexts/ErrorToastContext'
import { API_BASE } from '../lib/apiBase'
import { RateBubble } from './RateBubble'
import {
  BlockIcon,
  BookmarkIcon,
  ChartIcon,
  CodeIcon,
  CommentIcon,
  FlagIcon,
  HeartIcon,
  ListIcon,
  MoreIcon,
  NotInterestedIcon,
  PersonAddIcon,
  PersonStarIcon,
  RepostIcon,
  ShareIcon,
  VolumeOffIcon,
} from './icons'

export interface RateCardProps {
  id: string
  raterName: string
  raterHandle: string
  raterAvatar?: string
  gameName: string
  rating: number
  body: string
  timeAgo: string
  commentCount?: number
  likeCount?: number
  bookmarkCount?: number
  repostCount?: number
  images?: string[]
  /** When set, show Follow/Following if rater is not current user */
  currentUsername?: string
  isFollowing?: boolean
  onFollow?: () => void
  onUnfollow?: () => void
  /** Persisted like state from server */
  liked?: boolean
  onLike?: () => void
  onUnlike?: () => void
  /** For comment thread: current user display name and callback when count changes */
  currentUserDisplayName?: string
  onCommentAdded?: (newCount: number) => void
  /** Persisted bookmark (saved) state from server */
  bookmarked?: boolean
  onBookmark?: () => void
  onUnbookmark?: () => void
  /** When set, @handle becomes clickable and calls this with the handle */
  onRaterClick?: (handle: string) => void
  /** When set, show a "View" link that opens this rate in detail */
  onViewRate?: (rateId: string) => void
}

type CommentItem = {
  id: string
  rateId: string
  username: string
  displayName: string
  body: string
  createdAt: string
}

function formatCommentTime(createdAt: string): string {
  const ms = Date.now() - new Date(createdAt).getTime()
  if (ms < 60_000) return 'Now'
  if (ms < 3600_000) return `${Math.floor(ms / 60_000)}m`
  if (ms < 86400_000) return `${Math.floor(ms / 3600_000)}h`
  if (ms < 604800_000) return `${Math.floor(ms / 86400_000)}d`
  return `${Math.floor(ms / 604800_000)}w`
}

export function RateCard({
  id: rateId,
  raterName,
  raterHandle,
  gameName,
  rating,
  body,
  timeAgo,
  commentCount = 0,
  likeCount = 0,
  bookmarkCount = 0,
  repostCount = 0,
  images = [],
  currentUsername,
  isFollowing = false,
  onFollow,
  onUnfollow,
  liked = false,
  onLike,
  onUnlike,
  currentUserDisplayName,
  onCommentAdded,
  bookmarked = false,
  onBookmark,
  onUnbookmark,
  onRaterClick,
  onViewRate,
}: RateCardProps) {
  const { showError } = useErrorToast()
  const isOwnRate = currentUsername != null && currentUsername.trim().toLowerCase() === raterHandle.trim().toLowerCase()
  const showFollowButton = currentUsername != null && !isOwnRate && onFollow != null && onUnfollow != null
  const [menuOpen, setMenuOpen] = useState(false)
  const [commentsOpen, setCommentsOpen] = useState(false)
  const [comments, setComments] = useState<CommentItem[]>([])
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [replySubmitting, setReplySubmitting] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen])

  useEffect(() => {
    if (!commentsOpen || !rateId) return
    setCommentsLoading(true)
    fetch(`${API_BASE}/api/rates/${encodeURIComponent(rateId)}/comments`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data: CommentItem[]) => setComments(Array.isArray(data) ? data : []))
      .catch(() => setComments([]))
      .finally(() => setCommentsLoading(false))
  }, [commentsOpen, rateId])

  const menuItems = [
    { icon: NotInterestedIcon, label: 'Not interested in this rate' },
    { icon: PersonAddIcon, label: `Follow @${raterHandle}` },
    { icon: PersonStarIcon, label: `Subscribe to @${raterHandle}` },
    { icon: ListIcon, label: 'Add / remove from Lists' },
    { icon: VolumeOffIcon, label: 'Mute @' + raterHandle },
    { icon: BlockIcon, label: `Block @${raterHandle}` },
    { icon: ChartIcon, label: 'View rate activity' },
    { icon: CodeIcon, label: 'Embed rate' },
    { icon: FlagIcon, label: 'Report rate' },
  ]

  return (
    <article className="relative border-b border-surface-border px-4 py-3 transition-colors hover:bg-surface-hover/50">
      {/* More button — top right of the rate/tweet */}
      <div className="absolute right-4 top-3 z-10" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          className="rounded-full p-1.5 text-[var(--color-text-muted)] transition-colors hover:bg-gold-500/10 hover:text-gold-400"
          aria-label="More options"
          aria-expanded={menuOpen}
        >
          <MoreIcon className="h-5 w-5" />
        </button>

        {/* Dropdown menu — Twitter-style */}
        {menuOpen && (
          <div className="absolute right-0 top-full mt-1 min-w-[280px] overflow-hidden rounded-2xl bg-surface-elevated py-1 shadow-xl ring-1 ring-surface-border">
            {menuItems.map(({ icon: Icon, label }) => (
              <button
                key={label}
                type="button"
                className="flex w-full items-center gap-3 px-4 py-3 text-left text-[15px] text-[var(--color-text)] transition-colors hover:bg-surface-hover"
              >
                <Icon className="h-5 w-5 shrink-0 text-[var(--color-text-muted)]" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-3 pr-8">
        {/* Avatar */}
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-surface-elevated text-gold-400">
          <span className="text-lg font-semibold">{raterName[0]}</span>
        </div>

        <div className="min-w-0 flex-1">
          {/* Header: name, handle, time, Follow button */}
          <div className="flex flex-wrap items-center gap-1">
            <span className="truncate font-semibold text-[var(--color-text)]">
              {raterName}
            </span>
            {onRaterClick ? (
              <button
                type="button"
                onClick={() => onRaterClick(raterHandle)}
                className="truncate text-[var(--color-text-muted)] hover:text-gold-400 hover:underline"
              >
                @{raterHandle}
              </button>
            ) : (
              <span className="truncate text-[var(--color-text-muted)]">
                @{raterHandle}
              </span>
            )}
            <span className="shrink-0 text-[var(--color-text-muted)]">·</span>
            <span className="shrink-0 text-[var(--color-text-muted)]">
              {timeAgo}
            </span>
            {onViewRate && (
              <button
                type="button"
                onClick={() => onViewRate(rateId)}
                className="shrink-0 text-sm font-medium text-gold-400 hover:underline"
              >
                View
              </button>
            )}
            {showFollowButton && (
              <span className="ml-auto">
                <button
                  type="button"
                  onClick={isFollowing ? onUnfollow : onFollow}
                  className={`rounded-full border px-3 py-1 text-sm font-semibold transition-colors ${
                    isFollowing
                      ? 'border-surface-border bg-transparent text-[var(--color-text)] hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-400'
                      : 'border-gold-500/50 bg-gold-500/10 text-gold-400 hover:bg-gold-500/20'
                  }`}
                >
                  {isFollowing ? 'Following' : 'Follow'}
                </button>
              </span>
            )}
          </div>

          {/* Game name */}
          <div className="mt-1">
            <span className="font-medium text-gold-400">{gameName}</span>
          </div>

          {/* Body text */}
          <p className="mt-2 whitespace-pre-wrap text-[15px] leading-5 text-[var(--color-text)]">
            {body}
          </p>

          {/* Image attachments */}
          {Array.isArray(images) && images.length > 0 && (
            <div
              className={`mt-3 grid gap-2 ${
                images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'
              }`}
            >
              {images.slice(0, 4).map((url) => (
                <div
                  key={url}
                  className="overflow-hidden rounded-2xl border border-surface-border/70 bg-surface-hover"
                >
                  <img
                    src={url}
                    alt="Rate attachment"
                    className="max-h-64 w-full object-cover"
                  />
                </div>
              ))}
            </div>
          )}

          {/* Engagement row */}
          <div className="mt-3 flex items-center gap-6 text-[var(--color-text-muted)]">
            <button
              type="button"
              onClick={() => setCommentsOpen((open) => !open)}
              className={`flex items-center gap-1.5 rounded-full p-1.5 transition-[color,transform] duration-200 hover:scale-110 hover:bg-blue-500/10 hover:text-blue-400 ${commentsOpen ? 'text-blue-400' : ''}`}
              aria-label="Comments"
              aria-expanded={commentsOpen}
            >
              <CommentIcon className="h-4 w-4" />
              <span className="text-sm">{commentCount}</span>
            </button>
            <button
              type="button"
              onClick={liked ? () => onUnlike?.() : () => onLike?.()}
              className={`flex items-center gap-1.5 rounded-full p-1.5 transition-[color,transform] duration-200 hover:scale-110 hover:bg-red-500/10 hover:text-red-500 ${liked ? 'text-red-500' : 'hover:text-red-500'}`}
              aria-label={liked ? 'Unlike' : 'Like'}
            >
              <HeartIcon className="h-4 w-4" />
              <span className="text-sm">{likeCount}</span>
            </button>
            <button
              type="button"
              onClick={bookmarked ? () => onUnbookmark?.() : () => onBookmark?.()}
              className={`flex items-center gap-1.5 rounded-full p-1.5 transition-[color,transform] duration-200 hover:scale-110 hover:bg-green-500/10 hover:text-green-500 ${bookmarked ? 'text-green-500' : 'hover:text-green-500'}`}
              aria-label={bookmarked ? 'Unsave' : 'Save'}
              title={bookmarked ? 'Unsave' : 'Save'}
            >
              <BookmarkIcon className="h-4 w-4" />
              <span className="text-sm">{bookmarkCount}</span>
            </button>
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-full p-1.5 transition-colors hover:bg-gold-500/10 hover:text-gold-400"
              aria-label="Repost rate"
              title="Repost"
            >
              <RepostIcon className="h-4 w-4" />
              <span className="text-sm">{repostCount}</span>
            </button>
            <button
              type="button"
              className="rounded-full p-1.5 transition-colors hover:bg-gold-500/10 hover:text-gold-400"
              aria-label="Share"
            >
              <ShareIcon className="h-4 w-4" />
            </button>
          </div>

          {/* Comment thread — expandable */}
          {commentsOpen && (
            <div className="mt-4 border-t border-surface-border pt-3">
              {commentsLoading ? (
                <p className="py-2 text-sm text-[var(--color-text-muted)]">Loading comments…</p>
              ) : (
                <ul className="space-y-3">
                  {comments.map((c) => (
                    <li key={c.id} className="flex gap-2">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-elevated text-sm font-semibold text-gold-400">
                        {c.displayName[0]?.toUpperCase() ?? '?'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 text-sm">
                          <span className="font-semibold text-[var(--color-text)]">{c.displayName}</span>
                          <span className="text-[var(--color-text-muted)]">@{c.username}</span>
                          <span className="text-[var(--color-text-muted)]">·</span>
                          <span className="text-[var(--color-text-muted)]">{formatCommentTime(c.createdAt)}</span>
                        </div>
                        <p className="mt-0.5 whitespace-pre-wrap text-[15px] leading-5 text-[var(--color-text)]">
                          {c.body}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              {currentUsername != null && (
                <form
                  className="mt-4 flex gap-2"
                  onSubmit={async (e) => {
                    e.preventDefault()
                    const text = replyText.trim()
                    if (!text || replySubmitting) return
                    setReplySubmitting(true)
                    try {
                      const res = await fetch(`${API_BASE}/api/rates/${encodeURIComponent(rateId)}/comments`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          username: currentUsername,
                          displayName: currentUserDisplayName ?? 'Guest',
                          body: text,
                        }),
                      })
                      const data = await res.json().catch(() => ({}))
                      if (res.ok && data.comment) {
                        setComments((prev) => [...prev, data.comment])
                        setReplyText('')
                        onCommentAdded?.(data.commentCount ?? comments.length + 1)
                      } else {
                        showError(data.error || 'Could not post reply')
                      }
                    } catch {
                      showError('Could not post reply')
                    } finally {
                      setReplySubmitting(false)
                    }
                  }}
                >
                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Reply…"
                    className="min-w-0 flex-1 rounded-full border border-surface-border bg-surface-hover px-4 py-2 text-[15px] text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:border-gold-500/50 focus:outline-none focus:ring-1 focus:ring-gold-500/50"
                    disabled={replySubmitting}
                  />
                  <button
                    type="submit"
                    disabled={!replyText.trim() || replySubmitting}
                    className="shrink-0 rounded-full bg-gold-500 px-4 py-2 text-sm font-semibold text-black transition-opacity disabled:cursor-not-allowed disabled:opacity-50 hover:enabled:bg-gold-400"
                  >
                    Reply
                  </button>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Rating on the far right, closer to the border */}
        <div className="-mr-4 flex shrink-0 items-center pt-9">
          <RateBubble rating={rating} size="sm" />
        </div>
      </div>
    </article>
  )
}
