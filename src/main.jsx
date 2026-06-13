import '@tabler/icons-webfont/dist/tabler-icons.min.css'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { initPostHog } from './analytics'

if (import.meta.env.VITE_POSTHOG_KEY) {
  initPostHog(import.meta.env.VITE_POSTHOG_KEY)
}

const savedTheme = localStorage.getItem('tc-theme')
if (savedTheme) {
  document.documentElement.setAttribute('data-theme', savedTheme)
}

// TODO: remove before submission build — on-device debug console (native only).
// Dynamic import keeps eruda out of the web bundle; native guard keeps it off the website.
if (window.Capacitor?.isNativePlatform?.()) {
  import('eruda').then(({ default: eruda }) => eruda.init())
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)