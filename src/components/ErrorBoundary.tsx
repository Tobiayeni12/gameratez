import React, { ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught error:', error, info)
  }

  reset = () => {
    this.setState({ hasError: false, error: undefined })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-surface text-[var(--color-text)]">
          <div className="rounded-2xl border border-red-500/30 bg-red-950/20 p-6 max-w-md text-center">
            <h1 className="text-xl font-bold text-red-400 mb-2">Something went wrong</h1>
            <p className="text-sm text-red-300/80 mb-4">{this.state.error?.message}</p>
            <button
              onClick={this.reset}
              className="rounded-full bg-gold-500 px-4 py-2 text-sm font-semibold text-black hover:bg-gold-400 active:scale-95 transition-transform"
            >
              Try again
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
