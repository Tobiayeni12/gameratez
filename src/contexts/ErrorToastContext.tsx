import { createContext, useCallback, useContext, useRef, useState } from 'react'

type ErrorToastContextValue = {
  showError: (message: string) => void
}

const ErrorToastContext = createContext<ErrorToastContextValue | null>(null)

const AUTO_DISMISS_MS = 5000

export function ErrorToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showError = useCallback((msg: string) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setMessage(msg ?? 'Something went wrong')
    timerRef.current = setTimeout(() => {
      setMessage(null)
      timerRef.current = null
    }, AUTO_DISMISS_MS)
  }, [])

  const dismiss = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    setMessage(null)
  }, [])

  return (
    <ErrorToastContext.Provider value={{ showError }}>
      {children}
      {message && (
        <div
          role="alert"
          className="fixed bottom-6 left-1/2 z-[100] flex max-w-[min(90vw,400px)] -translate-x-1/2 items-center gap-3 rounded-xl border border-red-500/30 bg-red-950/95 px-4 py-3 shadow-lg backdrop-blur-sm"
        >
          <span className="flex-1 text-sm font-medium text-red-200">{message}</span>
          <button
            type="button"
            onClick={dismiss}
            className="shrink-0 rounded-lg px-2 py-1 text-xs font-medium text-red-300 hover:bg-red-500/20 hover:text-white"
            aria-label="Dismiss"
          >
            Dismiss
          </button>
        </div>
      )}
    </ErrorToastContext.Provider>
  )
}

export function useErrorToast(): ErrorToastContextValue {
  const ctx = useContext(ErrorToastContext)
  if (!ctx) throw new Error('useErrorToast must be used within ErrorToastProvider')
  return ctx
}
