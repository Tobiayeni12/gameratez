import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { ErrorToastProvider } from './contexts/ErrorToastContext'
import { ErrorBoundary } from './components/ErrorBoundary'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <ErrorToastProvider>
        <App />
      </ErrorToastProvider>
    </ErrorBoundary>
  </StrictMode>,
)
