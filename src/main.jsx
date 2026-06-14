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

// TODO: remove before submission build — on-device debug console.
// hostname is 'localhost' in the native webview AND in local dev, never on truecalorie.net,
// so this loads reliably on device and stays off production web.
if (window.location.hostname === 'localhost') {
  import('eruda')
    .then((m) => { (m.default || m).init() })
    .catch((err) => window.alert('[eruda] failed to load: ' + (err?.message || err)))
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)