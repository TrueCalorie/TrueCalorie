# CLAUDE.md — TrueCalorie

Project context for Claude Code. Read this before making any changes.

## What this is
TrueCalorie: a calorie and macro tracking PWA for athletes, also shipped as native iOS
and Android apps via Capacitor (iOS on TestFlight). Live at truecalorie.net.
Positioning: voice-first logging ("talk to log your meal"), athlete-calibrated targets,
Strava intelligence. Voice logging is the strategic centerpiece; weigh new features against it.

## Project-state doc
CONTEXT.md at repo root is the canonical project-state document. End every significant session with /wrap-session. Never edit CONTEXT.md outside /wrap-session without explicit instruction.

## Stack
- Frontend: React + Vite (PWA, installable on mobile)
- Hosting: Vercel — auto-deploys on push to `main`
- Backend: Supabase (auth, Postgres, RLS)
- Payments: Stripe (live mode), API version `2026-04-22.dahlia`
- Food data: Open Food Facts + USDA (free: grocery/barcode), Nutritionix (Pro: restaurant + primary voice NLP)
- Voice: Web Speech API (STT) -> /api/voice-log (Nutritionix NLP primary, Claude Haiku fallback)
- Strava: OAuth + activities API

## Native / Capacitor — do not violate
- The PWA is wrapped with Capacitor for iOS (TestFlight) and Android. `ios/` and
  `android/` are in `.gitignore` and are never committed. The iOS project is
  regenerated on the cloud Mac with `npx cap add ios && npx cap sync`. Never create,
  modify, or commit anything under `ios/` from this machine.
- Native detection: use `window.Capacitor?.isNativePlatform?.()` — the safe
  window-property form used in `src/App.jsx` and `src/components/VoiceLogger.jsx`.
  Do not invent alternatives. (`import { Capacitor }` from `@capacitor/core` is only
  safe inside async dynamic-import contexts as in `src/Auth.jsx`.)
- Relative fetches to `/api/*` resolve to `capacitor://localhost/api/*` on native and
  break silently. Prepend `https://truecalorie.net` when running native. Follow the
  pattern already in `src/components/VoiceLogger.jsx`:
  ```js
  (window.Capacitor?.isNativePlatform?.() ? 'https://truecalorie.net' : '') + '/api/voice-log'
  ```
- Deep-link returns use the custom scheme `truecalorie://`. There is exactly one
  `appUrlOpen` listener in `src/App.jsx` that handles OAuth code exchange. New native
  return flows must reuse that listener; never add a parallel one.
- Voice logging uses `window.webkitSpeechRecognition` (Web Speech API) in WKWebView,
  supported on iOS 16.4+. There is no native speech recognition plugin. Do not add one:
  `@capacitor-community/speech-recognition` was removed because it has no `Package.swift`
  and is incompatible with Capacitor 8 SPM.
- On the cloud Mac, all `VITE_*` env vars and `CAPACITOR_BUILD=true` must be exported
  manually before running `npm run build && npx cap sync`. Vercel env injection does not
  exist there; a missing `VITE_*` var fails silently as a black screen. `CAPACITOR_BUILD`
  is read in `vite.config.js` to disable the PWA service-worker plugin for native builds.

## Commands
- Install deps: `npm install`
- Dev server: `npm run dev`
- Production build (RUN BEFORE EVERY COMMIT): `npm run build`
- Preview a build: `npm run preview`
(If a script name differs, check package.json and use the real one.)

## CRITICAL deploy rule
Pushing to `main` deploys straight to production on Vercel. NEVER push to `main`
without my explicit go-ahead. Default to a feature branch. I review the diff and a
clean local `npm run build` before anything is pushed.

## Conventions — do not violate
- No em dashes anywhere in user-facing copy (landing page, in-app text, marketing).
  Use periods, commas, or rewrite. They read as AI-generated.
- All styling is inline styles via CSS variables: var(--text), var(--muted),
  var(--surface), var(--surface2), var(--border), var(--bg), var(--accent).
  No Tailwind, no CSS modules.
- Files in src/components/ import supabase as `'../supabase'`, NOT `'./supabase'`.
  This is a recurring bug. Check the path on any new component.
- Filenames are case-sensitive on Vercel (Linux) but not on Windows locally.
  Match import case exactly.
- Never use `.toISOString().split('T')[0]` for date grouping or day-boundary queries
  (UTC bug for US users logging in the evening). Use a local-date helper:
  ```js
  function toLocalDateStr(date) {
    const d = new Date(date)
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
  }
  ```
- Supabase existence checks: use `.maybeSingle()`, not `.single()` (`.single()` throws 406 on no rows).
- `usePro()` must be called at the top of a component, before any conditional return.
- When using usePro, guard renders with `if (loading) return null`.

## Product decisions — do NOT re-litigate
- Pro gating uses tease-and-preview (blur + upgrade prompt), not a hard paywall.
- Restaurant search and voice NLP are Pro-gated specifically so free users generate
  zero Nutritionix cost.
- Headline positioning leads with product quality, not athlete exclusivity.
  Athletes are the audience; voice is the feature.

## Pro / trial model
- 7-day free trial on signup, no card. Trial grants full Pro access.
- usePro() returns: isPro (true during trial), isTrialing (= isPro && source === 'trial'),
  trialDaysLeft, source ('founder' | 'monthly' | 'annual' | 'comp' | 'trial'),
  expiresAt, loading.
- Pro features: restaurant search, voice logging, athletic targets, Trends tab.

## Stripe notes
- Subscription period end lives at `subscription.items.data[0].current_period_end`,
  NOT `subscription.current_period_end` (removed in Stripe Basil+). Reading the old
  field returns undefined and crashes the webhook.
- create-checkout-session.js expects `userEmail`, not `email`.
- stripe-webhook.js needs `export const config = { api: { bodyParser: false } }` for raw body.

## Env vars (names only — values live in Vercel, never commit values)
Client (VITE_): VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_NUTRITIONIX_APP_ID,
VITE_NUTRITIONIX_APP_KEY, VITE_STRAVA_CLIENT_ID, VITE_STRIPE_FOUNDERS_LINK,
VITE_USDA_API_KEY, VITE_APP_URL, VITE_POSTHOG_KEY
Server: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_ID_MONTHLY,
STRIPE_PRICE_ID_ANNUAL, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY,
NUTRITIONIX_APP_ID, NUTRITIONIX_APP_KEY, STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET,
PORTAL_RETURN_URL, POSTHOG_KEY

## Key files
- src/App.jsx — main shell (calorie ring, macro bars, meal log, all overlays)
- src/Settings.jsx, src/Onboarding.jsx, src/Landing.jsx, src/Auth.jsx,
  src/Purchases.jsx, src/Stats.jsx, src/Founders.jsx
- src/hooks/usePro.js — Pro/trial status
- src/macros.js — goal and macro math
- src/components/ — LogFoodSheet, VoiceLogger, RestaurantSearch, BarcodeScanner,
  Trends, TrainingSection, WaterCard, WeightCard, StravaCard, StravaConnect,
  MealEditModal, CombineMealModal, FoodDetailModal, UpgradeModal
- api/ — stripe-webhook.js, create-checkout-session.js, create-portal-session.js,
  voice-log.js, strava-callback.js, strava-activities.js, strava-training.js

## How I like to work
- Scope and plan before editing. Use plan mode for any multi-file change.
- Make minimal, precise edits and show me the diff.
- When fixing a bug, grep the WHOLE repo for the same pattern. Do not fix one instance
  and miss the others.
- Run `npm run build` and fix any breakage before telling me a task is done.
