import { createContext, useCallback, useContext, useRef, useState } from 'react'

type ErrorToastContextValue = {
  showError: (message: string) => void
  showSuccess: (message: string) => void
}

const ErrorToastContext = createContext<ErrorToastContextValue | null>(null)

const AUTO_DISMISS_MS = 5000

export function ErrorToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState<string | null>(null)
  const [isError, setIsError] = useState(true)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showError = useCallback((msg: string) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setMessage(msg ?? 'Something went wrong')
    setIsError(true)
    timerRef.current = setTimeout(() => {
      setMessage(null)
      timerRef.current = null
    }, AUTO_DISMISS_MS)
  }, [])

  const showSuccess = useCallback((msg: string) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setMessage(msg ?? 'Success')
    setIsError(false)
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
    <ErrorToastContext.Provider value={{ showError, showSuccess }}>
      {children}
      {message && (
        <div
          role="alert"
          className={`fixed top-6 left-1/2 z-[100] flex max-w-[min(90vw,400px)] -translate-x-1/2 items-center gap-3 rounded-xl border px-4 py-3 shadow-lg backdrop-blur-sm ${
            isError
              ? 'border-red-500/30 bg-red-950/95'
              : 'border-green-500/30 bg-green-100/95 text-green-900'
          }`}
        >
          <span className={`flex-1 text-sm font-medium ${
            isError ? 'text-red-200' : 'text-green-900'
          }`}>{message}</span>
          <button
            type="button"
            onClick={dismiss}
            className={`shrink-0 rounded-lg px-2 py-1 text-xs font-medium hover:bg-opacity-20 hover:text-white ${
              isError
                ? 'text-red-300 hover:bg-red-500'
                : 'text-green-700 hover:bg-green-500 hover:text-white'
            }`}
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
