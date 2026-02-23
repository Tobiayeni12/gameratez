/**
 * Base URL for API requests. Empty in dev (Vite proxies /api to the local server).
 * Set VITE_API_BASE_URL in production to your deployed backend (e.g. https://your-app.onrender.com).
 */
export const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')
