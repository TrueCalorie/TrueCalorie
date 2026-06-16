# TrueCalorie Context Document
Last updated: June 15, 2026 (repo at 193f70c on main; pre-launch QA batch + Strava native OAuth finalized, all merged to main; a TestFlight rebuild superseding 1.0 build 32 is in flight and not yet device-verified). This file is the single canonical copy of project state. Version history lives in git: `git log -- CONTEXT.md`. This file is updated only via the /wrap-session command; do not edit it ad hoc.

This is the canonical context document. Any Claude chat working on TrueCalorie should treat this as the source of truth for project state, decisions, and conventions. Search project knowledge (this doc, CLAUDE.md, and the synced repo) before making assumptions about current file contents. When this doc and the repo disagree, the repo wins; flag the discrepancy.

---

## 1. What TrueCalorie is

Calorie and macro tracking built for serious athletes, particularly runners and weightlifters. Live at truecalorie.net as a PWA, wrapped with Capacitor for native iOS (TestFlight) and Android. Sole founder and developer: Jackson Parrill, competitive distance runner at South Dakota School of Mines, non-coder building entirely through AI assistance (Claude Code on Windows, MacinCloud for Xcode). TrueCalorie LLC, incorporated in Colorado.

**Positioning:** voice-first logging ("talk to log your meal"), athlete-calibrated adaptive targets, Strava intelligence. Voice logging is the strategic centerpiece; weigh every new feature against it. Closest comparable: MacroFactor.

**Competitive framing (use this, it survives scrutiny):** MacroFactor's intake-plus-weight-trend TDEE algorithm is genuinely excellent over weeks; do not pitch against it on accuracy. TrueCalorie's edge is day-level responsiveness (today's long run raises today's target), logging speed via voice, and fueling-adequacy framing. The one-line version: "MacroFactor tells you what you burned on average last month. TrueCalorie tells you what to eat today because you ran 16 miles this morning."

**Brand stance, now explicit:** TrueCalorie is the "eat enough" tracker. Adaptive targets go up with training, under-fueling warnings exist, deficits for athletes are deliberately small. In a sport where under-fueling (RED-S) is the quiet epidemic, this is both the ethical configuration and the strongest differentiator against weight-loss-culture trackers. This angle leads the Mines pilot pitch and should progressively enter site copy.

**Brand voice:** direct and human. No em dashes anywhere in user-facing copy. No AI-sounding language. Core tagline: "Eating is training."

---

## 2. Stack and infrastructure

- **Frontend:** React + Vite PWA, inline styles via CSS variables (no Tailwind, no CSS modules)
- **Hosting:** Vercel, auto-deploys on push to main; every branch push generates a preview deployment URL (use these before merging)
- **Backend/Auth/DB:** Supabase Pro (custom auth domain auth.truecalorie.net), RLS throughout
- **Payments:** Stripe live mode, API version 2026-04-22.dahlia, Customer Portal configured
- **Food data:** USDA FoodData Central + Open Food Facts (free tiers), Nutritionix (Pro-gated: restaurant search + primary voice NLP, MAU-priced)
- **Voice:** webkitSpeechRecognition in browser/WKWebView (iOS 16.4+) -> /api/voice-log (Nutritionix NLP primary, Claude Haiku fallback, temperature 0). No native speech plugin; deliberately removed for Capacitor 8 SPM incompatibility.
- **Native:** Capacitor (iOS + Android). ios/ regenerated each MacinCloud session, never committed. @capacitor/browser now wired for external Stripe URLs.
- **Analytics:** PostHog (US cloud), client via posthog-js through src/analytics.js, server via posthog-node in stripe-webhook
- **Auth providers:** email/password, Google OAuth, Sign in with Apple (web OAuth flow, live as of June 10)
- **Integrations:** Strava OAuth + activities; push notifications via Vercel cron 19:00 UTC
- **Email:** Resend SMTP on truecalorie.net via Namecheap DNS (configured, currently unused for marketing)
- **Repo:** GitHub TrueCalorie/TrueCalorie, Claude Code with CLAUDE.md as binding conventions

---

## 3. Current state (end of day, June 15, 2026)

### Pre-launch QA batch + Strava native OAuth finalized (June 15, 2026)

Everything below is **merged + pushed to main** (Vercel auto-deploys web). The native-facing pieces ride a **TestFlight rebuild now in flight** (supersedes 1.0 build 32, which was in review); **none of the native changes are device-verified yet.** HEAD at 193f70c. All work this session followed the standard flow: feature branch, `npm run build` clean, diff reviewed, no-ff merge to local main, push.

**Strava native OAuth — CLOSED.** The deep-link return built this session (`truecalorie://strava`, the single appUrlOpen listener in App.jsx, a `__native` flag in the OAuth `state`, a `redirectBack` helper across StravaConnect.jsx / api/strava-callback.js / App.jsx) was correct code. The real on-device failure was a **stale PWA service worker on the apex origin (truecalorie.net) in iOS Safari**: it intercepted the Strava redirect and served an old cached shell, short-circuiting both the apex->www 301 and the callback. That is why strava-callback never appeared in www logs (it never ran). Vercel was correct throughout (apex 301->www, www=production). Unblocked on device by clearing truecalorie.net website data in Safari. Durable fix shipped: `redirectUri` and the `appUrl` fallback moved off the apex to `https://www.truecalorie.net`; Strava now never touches the apex.

| Change | Hash | Notes |
|---|---|---|
| Route Strava OAuth through truecalorie:// on native | 380a784 (merge 2b3b988) | `__native` flag in `state`; deep-link return reuses the single appUrlOpen listener; `redirectBack` helper in strava-callback.js. Web flow unchanged. |
| Temporary [strava-debug] log in strava-callback | f8493ab (merge 421bccc) | Diagnostic only; removed in 077d923. |
| Point Strava redirect at www, drop debug log | 077d923 (merge e9aeaa8) | `redirectUri` (StravaConnect.jsx) + `appUrl` fallback (strava-callback.js) -> `https://www.truecalorie.net`; [strava-debug] removed. |

**QA punch list (all merged; client-side verified locally, device-verify in the rebuild):**

| Change | Hash | Notes |
|---|---|---|
| Account-deletion confirmation modal | 60c792b (merge edde084) | Settings.jsx: inline type-DELETE replaced with a centered modal (still requires typing DELETE, plus Cancel/backdrop, disabled mid-delete). The "no confirmation" seen on device was the stale bundle, not missing code. |
| Native Stripe success page | e49b80d (merge 29e713c) | New static public/checkout-success.html; create-checkout-session.js takes a `native` flag (success_url -> static page on native / app on web; both success and cancel URLs use www explicitly); UpgradeModal passes the flag. Pro still granted by the webhook; appStateChange resume refresh unchanged. (Cancel still lands on the in-sheet landing page; deferred, P2 #12.) |
| Hide broken Apple Health connect | 533bcc9 (merge de8d251) | BodyFitnessPage.jsx gated behind `APPLE_HEALTH_ENABLED=false`; code kept for re-enable. Renders nothing, so no empty container, divider, or layout gap. |
| Remove em dashes from user-facing copy | d4426d5 (merge 3ee12c0) | ~13 files; one decorative wrench emoji removed (StravaCard cycling note). Standalone "—" empty-value indicators and icon/status emoji left in place (flagged as indicators, not prose). |
| Emoji feature-icons -> Tabler glyphs | a875ecb (merge a624115) | Purchases PRO_FEATURES + Welcome-to-Pro icon + Trends locked-features now `ti-*` webfont icons, monochrome #1D9E75. Picks for the three unmapped: ti-file-export (CSV), ti-brand-strava (Strava), ti-wave-sine (rolling avg). Closes P2 #7. |
| Adaptive-targets copy | 0bb3577 (merge 2c92d9e) | BodyFitnessPage.jsx: no-Strava warning rewritten to explain the estimate (sport + weekly volume entered, same amount each day) vs Strava (calories from logged activities). Matches the `restDayBaseline + estimatedDailyTraining` vs `+ trailingBurn` logic in App.jsx. |
| Water entry delete | 10f980b (merge 6a8c9d2) | WaterCard.jsx: holds today's water_logs rows (id, amount_oz, logged_at); daily total now derived from the array; compact newest-first deletable list (le-del/ti-x), collapses past 4; quick-add/custom/5s-undo preserved. |
| Achievements streak fix | 6ff5446 (merge 2a1b326) | achievements.js: streaks now count consecutive CALENDAR days from today (walk-back, matches Stats.jsx currentStreak) instead of total logged days; goal_hit_1 is any logged in-range day; added a local toLocalDateStr (UTC off-by-one). Signature/return unchanged, no caller change. Caveat (pre-existing): the caller only fetches 30 days of logs, so streak_30 needs the full window present. |
| Native-feel CSS pass | e0fdaf6 (merge 193f70c) | index.css: -webkit-tap-highlight-color transparent, -webkit-touch-callout none, user-select none on chrome (inputs/textarea opt back in), -webkit-overflow-scrolling touch on the six scroll regions, touch-action manipulation on tappables, opacity press feedback on buttons. Scroll bounce deliberately untouched (P2 #11). |

**No-code (no git record):** Stripe dashboard logo updated; Apple sign-in display name fixed via the App ID Description.

**IN FLIGHT — not "done" until this passes.** Verify the whole batch on device in one pass: delete modal renders right; every Tabler glyph appears (watch ti-wave-sine and ti-calendar-month, version-dependent); no gap where Apple Health was; water list clean; post-purchase and Strava both complete and return to the app. Then re-run the money test: one $9.99 round trip (checkout -> Pro on resume -> subscription_activated in PostHog -> portal -> cancel -> refund).

### 1.0 SUBMITTED to App Review (June 14, 2026)

TrueCalorie 1.0, **build 32**, submitted to App Review June 14, 2026. Status: **in review, manual release** (the listing does not go live automatically on approval; Jackson releases it by hand to fire the launch). No git record; this is an App Store Connect operational action.

**Build distribution (durable lesson, now folded into the MacinCloud flow):** every earlier build (27-31) was uploaded as "TestFlight Internal Only," which can only be used for internal testing and can never be submitted for review (it shows greyed out in the App Store build picker). To submit, Xcode's Distribute App flow must choose **"App Store Connect," not "TestFlight Internal Only,"** and the build number must exceed the highest already uploaded. `cap add ios` resets the build number to 1 every session, so it must be bumped manually each time. Build 32 was the first App-Store-eligible build.

**Submitted listing (as-submitted; supersedes the planning in Section 5 item 4):**
- **Name in the record: "TrueCalorie: Athlete Nutrition"** (differs from the planned "TrueCalorie - Macro Tracker"; both acceptable. Metadata locks during review. Reconcile name + keywords in a later version if changing.)
- Subtitle "Calorie tracking for athletes". Keywords: counter,running,strava,protein,macros,marathon,weightlifting,food,log,voice,runner,fuel. Marketing + support URL https://truecalorie.net. Copyright 2026 TrueCalorie LLC.
- Primary category Health & Fitness. Pricing Free. Availability US-only. Release MANUAL.
- Content Rights: contains third-party content, rights confirmed. Regulated Medical Device: declared NOT one.
- **Age rating:** Health or Wellness Topics = YES, Medical/Treatment = NONE. May have landed above 4+; acceptable for this audience (supersedes the earlier "lands 4+" assumption in Section 5 item 4).

**App Privacy (as submitted; supersedes the prepared list in Section 5 item 4):** Contact Info (Email, Name); Health & Fitness (Health, Fitness); Identifiers (User ID); Purchases; Usage Data (Product Interaction). All linked to the user; none used for tracking (no ATT). Purposes: App Functionality across the board, plus Analytics (User ID, Purchases, Product Interaction) and Product Personalization (Health, Fitness). Payment Info and Audio deliberately NOT declared: Stripe handles payment externally and never returns card data to the app; voice transcribes to text on-device (Web Speech API), so no audio is collected.

**Next:**
- Await the review result (typically 1-2 days). Most likely bounce is **3.1.1 external payments**; if so, reply in Resolution Center citing the post-Epic US-storefront basis. Do NOT resubmit blind.
- On approval, **manually release** to fire the launch. HARD GATE holds: no TikTok reveal until the App Store link is live (Sections 5 and 6).
- Coach pitch (Mines pilot) queued for Monday AM as the paired market action; not gated on the store link (Section 6).

### Native POST blocker RESOLVED; native app verified end-to-end on a physical device (June 14, 2026)

The June 13 OPEN BLOCKER is closed. The native iOS app now works end to end on a real iPhone: Google and Apple OAuth, Stripe checkout + Manage Billing portal, voice logging, Strava sync, and account deletion all confirmed on device. This closes the device-verification gap open since June 9.

| Change | Hash | Notes |
|---|---|---|
| Drop CapacitorHttp from apiFetch; plain fetch on every platform | 11a5511 | MERGED + PUSHED to main. apiFetch.js is now just `fetch(apiUrl(path), {...})`; CapacitorHttp is no longer imported anywhere in src/. Reverts the June 13 native branch that downgraded POST to GET. |
| Point native apiUrl base at canonical www host | 6a922a1 | MERGED + PUSHED to main. Native /api base is now https://www.truecalorie.net (was the apex truecalorie.net). |

**Root cause of the entire native-POST failure (confirmed): an apex-to-www 301 redirect mid-request.** The app pointed native /api calls at the apex `truecalorie.net`, but the canonical host is `www.truecalorie.net` and the apex 301-redirects to it. A redirect mid-request breaks native cross-origin calls: plain browser fetch returns status 0, and CapacitorHttp silently downgrades the POST to a GET (the "got GET" diagnostic). Pointing the native base at the exact non-redirecting host (www) plus plain fetch + the existing server CORS resolved every native-only failure at once. Web was never affected (same-origin relative URLs); Supabase was never affected (own domain, no redirect). This is exactly the apex-vs-www path the June 13 "recommended next step" flagged as the thing to check.

**Four pre-launch UI fixes — merged to main June 14 (not yet device-verified; batched for one rebuild):**

| Change | Hash | Notes |
|---|---|---|
| Clear nav state on SIGNED_OUT + scroll-reset on screen change | 15ad3fb | App.jsx: SIGNED_OUT now clears pageHistory + the founders/privacy/terms flags (fixes login landing on Settings); added a window.scrollTo(0,0) effect keyed on currentPage / static-page flags / session?.user?.id (user id, not the session object, so a background token refresh does not yank scroll). Covers prompted fixes 1 and 2. |
| Stop Strava section flashing on Trends for non-connected users | c072f07 | TrainingSection.jsx guard was `!loading && (!data || !data.connected)`, which rendered during the load window then hid; now `if (loading || !data || !data.connected) return null`. |
| Settings Privacy/Terms links work on native | f9f563f | Were window.open('/privacy','_blank') / window.open('/terms','_blank') (no-op in WKWebView); now use Landing's pushState + dispatch popstate, which the App router catches. Closes Section 4 P2 #10. |

### App icon resolved + June 13 debug scaffolding stripped (June 14, 2026)

The app icon was a submission blocker: the native build shipped with a blank icon. Now resolved. **Brand mark is the "charged bolt": a white lightning bolt with a green #1D9E75 tip on a charcoal #14171c square**, replacing the old AI logo. Rationale: a bolt reads performance/athlete, where the progress ring every other tracker uses reads maintenance/diet. Separately, all June 13 debug scaffolding (live in production, including OAuth alerts that printed live session tokens) was removed.

| Change | Hash | Notes |
|---|---|---|
| Strip June 13 debug scaffolding | ceec784 | MERGED + PUSHED. Removed eruda import+init (and uninstalled the eruda npm package), the appUrlOpen/OAuth diagnostic alerts + the `[appUrlOpen listener registered]` console.log in App.jsx, the `[checkout]` status/threw alerts in Purchases.jsx, and reverted the `Method not allowed (got <method>)` 405 echo to plain `Method not allowed` across 7 api/*.js. **Real logic kept intact:** OAuth setSession-from-hash flow, the single appUrlOpen listener, all error/early-return guards, and the method guards + CORS + verifyUser in the api files. Closes Section 4 P2 #9. |
| Update web favicon + app icons | a80dfe6 | MERGED + PUSHED. Replaced /public favicon.svg, favicon.ico, icon-192.png, icon-512.png with the charged-bolt mark. og:image and twitter:image already point at icon-512.png, so link previews inherit it automatically. |
| Add @capacitor/assets tooling + source icon | 7ecfb7a | MERGED + PUSHED. Added @capacitor/assets (devDependency) and assets/icon-only.png (1024, the @capacitor/assets source for native icon generation). Source only: running the generator writes into the gitignored ios/ and happens on MacinCloud, never from Windows. |
| Swap the in-app logo to the charged-bolt mark | 51fdf76 | MERGED + PUSHED. Added /public/logo.svg (rounded charged-bolt), pointed the App.jsx header and components/LoadingScreen.jsx at it, dropped the --logo-filter dark-mode invert (the new mark is already colored, so inverting would break the green/white), and deleted the now-unused /public/logo.png. Grep confirmed no remaining code references to logo.png. |

**Status:** the charged-bolt mark is now live on native (in the build 32 submission) and web. The in-app header logo and loading screen were also migrated off the old /public/logo.png (bolt-and-ruler) to /public/logo.svg, and logo.png was deleted (51fdf76), completing the brand-mark migration. The brand-mark background is swappable to #0a0a0a for an exact app-match, and green coverage is adjustable, if a device render warrants it.

### Shipped to production June 13, 2026 (native API transport session, all merged to main)

| Change | Hash | Notes |
|---|---|---|
| Native /api routed through apiUrl helper + CORS on all client endpoints | 1b0d89a | New src/lib/apiUrl.js (prepends https://truecalorie.net on native); lib/cors.js applyCors on every client-called endpoint. Bearer-token auth, so Allow-Origin: * is safe. |
| Widen CORS Allow-Methods for push DELETE/PATCH | 8210aa9 | save-push-subscription uses DELETE/PATCH; Allow-Methods now GET, POST, PATCH, DELETE, OPTIONS. |
| OAuth: code-not-URL, then implicit-token handling | 561f612, c93631b, 1ea1ad0 | Final form parses #access_token/#refresh_token from the URL hash and calls supabase.auth.setSession; exchangeCodeForSession kept as the ?code= fallback. |
| Safe-area-inset-top extended to Founders, Privacy, Terms, Onboarding | 6c02170, 60eb536 | Completes the June 9 notch fix across the remaining top-anchored screens. Audit confirmed all other pages already covered; Auth (centered card) and bottom-sheet overlays need none. |
| scripts/patch-plist.sh committed | 267f979 | Idempotent Info.plist patcher (usage strings, ITSAppUsesNonExemptEncryption, truecalorie:// scheme). Was referenced by the MacinCloud build flow but missing from the repo. LF endings + exec bit (100755). |
| Bundle @capacitor/app & @capacitor/browser (the sign-in fix) | bf2797d | Root cause below. |
| Explicit CapacitorHttp.request for API calls + cache passthrough | d6a3b7e, 5a64f91 | Attempted native POST transport; SUPERSEDED and removed June 14 (11a5511). See the June 14 block above for the resolution. |
| eruda on-device debug console + alert/diagnostic scaffolding | 4c6b6b6, f7158fc | TEMPORARY. Gated to window.location.hostname === 'localhost' (localhost in WKWebView and local dev, never truecalorie.net). This is what finally gave native visibility. Strip before submission. |

**Sign in with Google AND Apple now work on a physical device (verified this session).** Two stacked root causes:
1. **@capacitor/app was never installed** (absent from package.json). It had been externalized in vite.config.js and dynamically imported with /* @vite-ignore */ to silence the build error, which left an unresolvable bare module specifier in the bundle that crashed the appUrlOpen listener at runtime ("Module name '@capacitor/app' does not resolve to a valid URL") — so the sign-in listener never registered. Fix: `npm install @capacitor/app@^8`, removed the externalize entries and the /* @vite-ignore */ comments so Vite resolves and code-splits the plugins. @capgo/capacitor-health and @capacitor-community/speech-recognition stay externalized (not @capacitor/* packages, not called on the platform).
2. **The OAuth callback returns the implicit-token format** (truecalorie://auth/callback#access_token=...&refresh_token=...), not ?code=. The handler now parses the URL hash and calls supabase.auth.setSession; exchangeCodeForSession remains the fallback path. Supabase (login + all reads) confirmed working on native via plain browser fetch.

**[RESOLVED June 14 — see the June 14 block at the top of Section 3. Root cause was the apex-to-www 301 redirect, not CapacitorHttp alone; fixed by 6a922a1 (www base) + 11a5511 (plain fetch). The diagnosis below is retained as the record of how it was found.]**

**OPEN BLOCKER — every authenticated POST to our own /api fails on native.** Affected: create-checkout-session, create-portal-session, voice-log, strava-activities, strava-training, delete-account, save-push-subscription. Login, OAuth, and all Supabase reads are fine. Diagnosis (not visible in git): the request reaches the server but arrives as **GET** — confirmed by the temporary server diagnostic returning "Method not allowed (got GET)" — under BOTH the global CapacitorHttp fetch patch AND explicit CapacitorHttp.request. src/lib/apiFetch.js is correct (it passes method:'POST' into CapacitorHttp.request, and the caller passes 'POST'), so the downgrade is happening inside CapacitorHttp's iOS layer, not our code. The endpoint is healthy: a direct GET to https://truecalorie.net/api/create-checkout-session returns its normal 405. Conclusion: **CapacitorHttp is not viable for our POSTs on iOS.** Plain browser fetch was tried earlier and was CORS-blocked ("Load failed"), but that attempt predates the @capacitor/app crash fix and may have been transient. This blocks the entire money path (checkout/portal), the voice centerpiece, Strava sync, account deletion, and push on iOS, so **no fully device-verified build exists yet.**

**[DONE June 14: this is exactly what shipped. The www-redirect hypothesis (option b) was the real cause.]** **Recommended next step (top of next session): remove CapacitorHttp entirely and revert apiFetch's native branch to plain `fetch`** so all calls use standard browser fetch + server CORS — the proven pattern, since Supabase makes the identical cross-origin call from the same WKWebView and succeeds and applyCors looks correct. Re-test on device first. If plain fetch still fails: (a) inspect the OPTIONS preflight in eruda's Network tab to see exactly where it dies; (b) check whether https://truecalorie.net/api/* issues an apex-vs-www or trailing-slash redirect that both breaks the CORS request and downgrades the method — if so, point apiUrl at the exact canonical host to remove the redirect. Current state to revert from: capacitor.config.json has NO CapacitorHttp block (removed in d6a3b7e), but apiFetch's native branch still calls CapacitorHttp.request — that branch is what to change.

### Shipped to production June 11, 2026

| Change | Hash | Notes |
|---|---|---|
| Server-side Pro gate + daily cap on Nutritionix endpoints | 74adc61 | voice-log.js and restaurant-search.js now enforce is_pro server-side (403 for non-Pro); per-user daily caps via the new api_rate_limits table (voice-log 25/day, restaurant-search 75/day). Closes P0 #1. Details below. |
| Privacy policy + Terms updated | 43017ad, 4ad37ad | Privacy: PostHog and Apple sign-in added to service providers. Privacy + Terms contact email switched from personal Gmail to support@truecalorie.net (all instances: prose, mailto href, link text). "Last updated" bumped to June 10. Closes P0 #2 except support@ inbox routing. |

**api_rate_limits (new Supabase table, migration run manually June 11 before deploy):** PRIMARY KEY (user_id, date, endpoint), call_count integer, RLS enabled with NO client-facing policy (the June 11 RLS audit removed the original USING(true)/WITH CHECK(true) ALL policy; the service role bypasses RLS and no client code touches this table, so no policy is the more restrictive, correct config). Both endpoints derive isPro from user_settings (deny on lookup error), then SELECT-then-UPDATE/INSERT the counter (Supabase upsert cannot atomically increment). UTC reset window (server-deterministic; an abuse cap, not user-facing day grouping, so the local-date helper deliberately does not apply). Rate-limit DB ops are fail-open: any error logs and continues, so a DB hiccup never blocks a paying user. The is_pro 403 gate is separate and hard-fails. voice-log routing unchanged (trial -> Haiku, paying Pro -> Nutritionix); isTrialing now = isPro && pro_source === 'trial'. Grep confirmed these two files are the only direct callers of trackapi.nutritionix.com; the client service routes through /api/restaurant-search.

### Operational actions (no git record), June 11

- **2FA enabled on all six core founder accounts:** GitHub, Vercel, Supabase, Stripe, Apple Developer, Google. Authenticator app (TOTP) on each, not SMS. The expanded audit scope in Known Gaps also lists three lower-priority accounts still pending: Namecheap, the password-manager vault, and Anthropic.
- **Supabase RLS audit completed and verified clean:** all tables rowsecurity=true; every INSERT policy has with_check auth.uid() = user_id; all SELECT/UPDATE/DELETE policies are user-scoped. api_rate_limits has RLS enabled with no client-facing policy (service role bypasses RLS; no client code touches the table), more restrictive than the original USING(true) policy.

### Shipped to production June 10 (session log, all merged to main)

| Change | Hash | Notes |
|---|---|---|
| CLAUDE.md Native/Capacitor section | dd7fd76 | Documents native landmines for all future sessions |
| Portal auth fix + social proof removal | 559ce18 | Purchases.jsx "Manage billing" was silently 401ing (old userId-in-body pattern); landing social proof block removed |
| Account deletion | 58825da | api/delete-account.js + Settings UI; details below |
| PostHog analytics | 29246b8 | Six-event schema, client + server; details below |
| Annual plan | f85f132 | $59.99/yr, preselected; details below |
| UpgradeModal auth fix | 57d0b1c | Checkout fetch was missing Bearer header since the June 4 security pass; modal revenue path was dead. Found during review, not on the original list. |
| Native Stripe browser routing | 0058c82 | src/lib/openExternal.js + appStateChange resume refresh; takes effect next native build |
| Apple secret generator | 3e31f28 | scripts/gen-apple-secret.mjs (jose, ES256); *.p8 gitignored |
| Sign in with Apple | a838a0c | Auth.jsx, mirrors Google flow; verified working in production on web |

Two production bugs were found and fixed that were not on the punch list (portal button, UpgradeModal checkout). Both were the same failure class: a server contract changed during the June 4 security pass and one caller was updated while another was missed. This is the signature of having no automated tests; see Known Gaps.

### Shipped and stable before June 10 (carried context)

- **June 9 native session: all four iOS TestFlight bugs fixed and merged.** (1) Input zoom: all inputs at 16px+ so iOS WKWebView stops auto-zooming on focus. (2) Notch/safe area: viewport-fit=cover plus env(safe-area-inset-top) padding across headers. (3) Voice on iOS: native speech plugin removed (Capacitor 8 SPM incompatibility); webkitSpeechRecognition in WKWebView (iOS 16.4+) with the native API-URL prefix pattern. (4) Google OAuth return: truecalorie:// custom scheme, single appUrlOpen listener in App.jsx. **Update June 13: Google and Apple sign-in are now verified working on a physical device** (after the @capacitor/app + implicit-token fixes in the June 13 block); note the working callback path is setSession from the URL hash, not exchangeCodeForSession as originally assumed. Items (1) input zoom and (2) notch/safe-area also hold on device; the remaining device checks (voice, the money test) are blocked by the OPEN BLOCKER (native POST transport) in the June 13 block.
- **Recipe Builder + Saved Foods (shipped ~June 7).** Two tabs in LogFoodSheet.jsx: Recipe Builder (assemble ingredients, name recipe, set serving count, log or save per-serving macros) and Saved Foods (consolidated view replacing the prior inline section). Backed by `recipes` and `recipe_ingredients` Supabase tables; RLS on recipe_ingredients uses the required cross-table subquery join pattern (do not simplify). Recipes are fully editable at the ingredient level.
- **Product surface inventory (for sector-chat orientation):** calorie ring + macro bars with count-up animation; meal log with edit/combine modals; logging via search (USDA/OFF), barcode, restaurant search (Nutritionix, Pro), voice (Pro), recipes, saved foods; adaptive athletic targets (Strava-driven, 3-day trailing burn average excluding today, with non-Strava estimate fallback); Trends tab (Pro: rolling average, week-over-week, consistency, weight projection, monthly heat map); Stats page with calorie trend chart and achievements; water logging with goal; weight logging with 7-day sparkline; CSV export (Pro); push notifications via 19:00 UTC Vercel cron; Founders page and purchase flow.
- **Distribution status:** iOS on TestFlight (build predating today's changes); Google Play developer account verified, AAB built and signed with signing.keystore, store listing / content rating / production release incomplete (resume point for roadmap step 5).

### Sign in with Apple configuration (critical reference)

- **Services ID (the OAuth client_id): `net.truecalorie.auth`** (NOT .signin; an early mismatch here produced invalid_client errors twice)
- Apple Developer setup: App ID has Sign in with Apple capability; Services ID configured with domain `truecalorie.net` (Apple's Domains field takes bare hostnames, no https://, and rejects the Supabase auth subdomain) and Return URL `https://auth.truecalorie.net/auth/v1/callback`
- Sign in with Apple key (.p8) downloaded and stored locally, never committed
- Supabase Providers > Apple: Client IDs = `net.truecalorie.auth`, Secret Key = JWT generated by `scripts/gen-apple-secret.mjs` (env vars: APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_SERVICE_ID, APPLE_P8_PATH)
- **The client secret JWT expires 180 days from generation: approximately December 7, 2026. Calendar reminder set for November 10, 2026 to regenerate and re-paste into Supabase. If missed, Apple sign-in silently breaks.**
- Native flow reuses the Google pattern: truecalorie:// deep link, single appUrlOpen listener in App.jsx, exchangeCodeForSession (provider-agnostic, verified)
- Apple button: above Google, black, white text, inline SVG logo (the  glyph renders as tofu off-Apple), e.currentTarget for hover handlers

### Analytics schema (LOCKED, exactly six events, do not add or rename without explicit instruction)

1. `app_opened` (once per mount when session exists, ref-guarded)
2. `onboarding_started` (Onboarding step 0 render; signup proxy)
3. `onboarding_completed` (final onboarding save)
4. `meal_logged { method: 'voice' | 'search' | 'barcode' | 'restaurant' | 'recipe' | 'saved' }` (every successful insert, all paths threaded)
5. `checkout_started { plan: 'monthly' | 'annual' | 'founders' }`
6. `subscription_activated { plan, source }` (server-side from stripe-webhook via posthog-node, flushAt:1 + shutdown per invocation, try/catch so analytics can never break webhook processing)

All client capture goes through src/analytics.js (no-op if VITE_POSTHOG_KEY absent). identify on SIGNED_IN, reset on SIGNED_OUT. Retention and "first voice log" are derived in PostHog, not separate events. Every new meal-insert code path MUST fire meal_logged with the correct method.

### Pricing and billing (current)

- **Pro Annual: $59.99/year, preselected** ("$5.00 a month. Save 50%."). Deliberate default; annual churns less and undercuts MacroFactor (~$72/yr).
- **Pro Monthly: $9.99/month**
- **Founders: $79.99 lifetime, capped at 100 spots.** Close at 100 or 30 days post-launch, whichever first. Never extend; never run lifetime pricing again (breakeven vs API costs ~2.7 years, then negative margin forever; cap bounds worst case at ~$3K/yr).
- 7-day no-card trial on signup. Keep until trial-to-paid conversion is measurable; revisit if under ~5% post-pilot.
- create-checkout-session.js: client sends `plan`, server maps to STRIPE_PRICE_ID_MONTHLY / STRIPE_PRICE_ID_ANNUAL env vars, sets `subscription_data.metadata.type` = pro_monthly | pro_annual. Webhook reads subscription metadata to set pro_source. (Metadata location pairing verified: both sides use the subscription object.)
- All Stripe URLs (checkout, portal, Founders payment link) route through openExternal(): web unchanged, native opens system browser sheet. On native resume (appStateChange), usePro refresh fires so Pro status reflects after payment.

### Account deletion (live, verified end-to-end on web)

api/delete-account.js: verifyUser Bearer token only; cancels Stripe subscription for monthly/annual; deletes recipe_ingredients before recipes (FK order); parallel-deletes all user rows (meal_logs, user_settings, weight_logs, strava_tokens, saved_foods, recipes, push_subscriptions, achievements, water_logs); nulls user_id and email on founders row (keeps payment record, removes PII, satisfies erasure rights and tax retention simultaneously); auth.admin.deleteUser last. Settings UI requires typing exact-match DELETE. Required by Apple 5.1.1(v) and Google Play policy; this was a guaranteed-rejection blocker before today.

---

## 4. Known gaps and open issues (prioritized)

### P0, fix before the TikTok reveal makes the app visible

_Was clear June 11; reopened June 13 by the native API-transport blocker; re-closed June 14._

1. **[RESOLVED June 14] Authenticated POST to /api fails on native.** Root cause was the apex-to-www 301 redirect, not CapacitorHttp alone; fixed by pointing the native base at https://www.truecalorie.net (6a922a1) and reverting to plain fetch (11a5511). Native checkout, portal, voice, Strava, and account deletion all verified on a physical device June 14. See the June 14 block in Section 3.
2. **Security: rotate the exposed Supabase session tokens.** Live access and refresh tokens were printed in on-device debug popups and appeared in screenshots during the June 13 session. The token-printing debug alerts were removed June 14 (ceec784, P2 item 9), so no new exposure occurs, but the already-exposed tokens still need rotation: sign out of all sessions / rotate before relaunch. This remains open.

The two prior P0 items (server-side Pro gate on Nutritionix endpoints, 74adc61; privacy policy + Terms update, 43017ad/4ad37ad) shipped June 11 and are recorded in the Section 3 shipped table. One residual from the privacy item, routing support@truecalorie.net to a monitored inbox, is tracked under App Store submission in the roadmap (Section 5, item 4).

### P1, soon after launch

1. **No error monitoring.** PostHog shows what users do; nothing reports when code breaks. A failing webhook is silent until a customer complains. Sentry free tier, one session. (Top priority now that P0 is clear.)
2. **No automated tests.** Today's two stale-caller bugs are the recurring cost. Mitigation that fits the workflow: a Claude Code-written smoke-test suite for API endpoints (auth rejection, checkout returns URL, webhook parses sample event), run before every merge.
3. **Account security audit (mostly done, June 11).** 2FA (authenticator app, not SMS) now enabled on all six core accounts: GitHub, Vercel, Supabase, Stripe, Apple, Google; GitHub also has a passkey and recovery codes in the password manager. Supabase RLS audit completed and verified clean (see Section 3 operational actions). Remaining (lower priority): Namecheap (DNS + truecalorie.net email), the password-manager vault itself, and the Anthropic account. Standing rule: prefer passkeys/TOTP, remove SMS fallbacks where allowed. Original rationale stands: one phished credential on a write-access account = production compromised.

### P2, cleanup list (do not let these jump the queue)

4. Trial copy inconsistency: Purchases CTA for post-trial users says "Start 7-day free trial, no card charged until trial ends" but the trial was already granted at signup. Watch in PostHog for confusion, then fix copy or flow.
5. Auth.jsx uses hardcoded hex colors (#0a0a0a, #111, #ef4444) instead of design-system CSS variables.
6. App.jsx is a god component (ring, bars, log, all overlays). Rule going forward: new features go in components, not App.jsx. Full refactor is not currently worth the risk.
7. **[DONE June 15, merged]** Emoji feature-icons replaced with monochrome Tabler glyphs (#1D9E75) in Purchases and Trends (a875ecb). Data/status emoji elsewhere (achievements, restaurants, sport, brand, action tiles) deliberately kept as functional icons.
8. Some text at 10 to 11px is below comfortable readability.
9. **[DONE June 14, merged + pushed] Stripped all June 13 debug scaffolding** (eruda init src/main.jsx + uninstalled the package, OAuth/appUrlOpen alerts + console.log src/App.jsx, [checkout] alerts src/Purchases.jsx, and the "Method not allowed (got ...)" 405 echo across api/*.js), in ceec784. Real logic left intact (OAuth setSession-from-hash, single appUrlOpen listener, method guards, CORS, verifyUser). The token-printing source is now gone from production; the already-exposed tokens still need rotation under P0 #2 above.
10. **[FIXED June 14, merged] Privacy Policy and Terms links in Settings go nowhere on native.** Fixed in f9f563f (switched from window.open to pushState + dispatch popstate, matching Landing). Merged to main; verify on device in the next rebuild.
11. **iOS scroll bounce (rubber-band) parked as post-launch polish.** There is no iOS rubber-band because Capacitor hardcodes `scrollView.bounces = false` in the bridge (@capacitor/ios/.../CAPBridgeViewController.swift:301). Ruled out CSS (no html rule, no overscroll-behavior; body and #root scroll naturally) and config (Capacitor 8.4.0 exposes no bounce option). Only fix is native: `scrollView.bounces = true` + `alwaysBounceVertical = true` after bridge load. Since ios/ is gitignored and regenerated each MacinCloud session, the durable fix is a small local Capacitor plugin (preferred); the lighter one is a ~4-line AppDelegate.swift edit reapplied each regen. Decision June 14: do neither now (cosmetic, new native surface right before submission, zero downside to deferring). Revisit post-launch. (Re-confirmed June 15: still no CSS/config path.)
12. **No native checkout-canceled page (June 15).** Native Stripe cancel still lands on the in-sheet web landing page with no app return; success now has its own static page (checkout-success.html) but cancel does not. Optional static checkout-canceled.html mirroring it. Cosmetic; cancel is the rare path.
13. **Apple Health re-enable note (June 15).** When flipping `APPLE_HEALTH_ENABLED` back to true in BodyFitnessPage.jsx, switch its native check from `Capacitor.isNativePlatform()` to the `window.Capacitor?.isNativePlatform?.()` window-property form per CLAUDE.md before shipping.
14. **Adaptive copy nuance (June 15).** The new no-Strava-vs-Strava copy says the target "rises on training days"; burn is a 3-day trailing average excluding today, so it actually rises the days after. Accepted as a simplification; tighten only if it confuses users.

---

## 5. Immediate roadmap (ordered, native launch track)

1. **DONE June 11: P0 items 1 and 2** (server-side Pro gate + rate cap 74adc61; privacy policy + Terms update 43017ad/4ad37ad). Web-only, deployed via Vercel. Only the support@ inbox routing remains, now tracked under App Store submission (item 4 below).
2. **MacinCloud session** (batch everything Xcode-related):
   - Master paste block now needs a fourth export: `export VITE_POSTHOG_KEY="phc_..."` alongside VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, CAPACITOR_BUILD=true. Missing it ships native with analytics silently disabled.
   - npm install pulls posthog-js and @capacitor/browser; cap sync registers the Browser plugin automatically.
   - After `cap sync ios`, run `./node_modules/.bin/capacitor-assets generate --ios` to stamp the app icon from assets/icon-only.png. This is now a required per-session step: ios/ regenerates each session, so the icon must be re-stamped every build (same role as patch-plist.sh).
   - Optional but recommended patch-plist.sh addition: `/usr/libexec/PlistBuddy -c "Add :ITSAppUsesNonExemptEncryption bool false" "$PLIST" 2>/dev/null || true` (skips the export compliance question every build).
   - In Xcode: uncheck iPad under Deployment Info (iPhone-only = no iPad screenshots, smaller review surface). Recreate App.entitlements manually as usual (no new entitlements needed; Apple sign-in is browser-flow). Increment build number. Archive, upload to TestFlight.
   - **Distribute App must use "App Store Connect," NOT "TestFlight Internal Only"** (internal-only builds can never be submitted for review and show greyed out in the build picker), and **bump the build number above the highest already uploaded** since `cap add ios` resets it to 1 each session. Builds 27-31 were wasted as internal-only; build 32 (App Store Connect distribution) was the first submittable one. See the June 14 submission block in Section 3.
3. **Device verification checklist (physical iPhone, in order).** _DONE June 14: the native POST blocker is resolved (apex-to-www redirect; Section 3 June 14 block), and the full path is now verified on a physical device — Google + Apple sign-in, Stripe checkout + Manage Billing portal (the money test), voice logging, Strava sync, and account deletion all confirmed. Inputs/notch hold. Remaining: device-verify the four pre-launch UI fixes (15ad3fb/c072f07/f9f563f, now merged) in one batched rebuild, with debug scaffolding still in for that pass, then strip it._ Original checklist retained for reference: fresh install; Google sign-in survives force-quit; sign out, Apple sign-in same checks; voice log a real meal and confirm meal_logged {voice} in PostHog Activity; inputs do not zoom, no notch overlap; Pro checkout opens a Safari sheet (not in-app); **the money test:** buy monthly on own card, confirm Pro activates on resume, confirm subscription_activated in PostHog, open Manage billing from the Purchases page specifically (regression test for the portal fix), cancel via portal, refund in Stripe dashboard. One $9.99 round trip validates checkout, webhook, source mapping, resume refresh, and the portal fix. Then delete-account on a throwaway.
4. **App Store submission: [SUBMITTED June 14 — 1.0 build 32, in review, manual release. See the submission block at the top of Section 3 for the as-submitted name, keywords, age rating, and privacy labels, which supersede the planning below. The bullets here are retained as the planning record and for the next submission.]**
   - Confirm support@truecalorie.net delivers to a monitored inbox before submitting. It is now the privacy policy and Terms legal contact; Resend/Namecheap is configured but end-to-end delivery is unverified. A reviewer emailing a dead contact address is an avoidable rejection risk.
   - Name: "TrueCalorie - Macro Tracker". Subtitle: "Calorie tracking for athletes". Keywords (100 chars, no spaces, no title-word repeats): counter,running,strava,protein,nutrition,marathon,weightlifting,food,log,voice,runner,fuel
   - Screenshots (6.9" set, order is the argument): 1 voice logging mid-parse, 2 adaptive target raised after a synced run, 3 daily ring, 4 Trends, 5 fueling gauge
   - Privacy labels: Contact Info (email), Health & Fitness, Identifiers (User ID), Usage Data (Product Interaction); linked to user, NOT used for tracking (no ATT needed)
   - App Review info: demo account reviewer@truecalorie.net with pro_source 'comp'; notes: full-access demo provided, mic permission needed for voice, Strava optional, "Purchases use external payment links in compliance with the App Review Guidelines for the United States storefront." If rejected on 3.1.1 anyway, reply in Resolution Center citing the post-Epic US guideline update; do not resubmit blind.
   - Age rating lands 4+; answer No to unrestricted web access.
5. **Play Store completion (resume from June 7 state, AAB exists and is signed):** store listing assets (reuse iOS screenshots; 512 icon; 1024x500 feature graphic); privacy policy URL + account deletion link (now exists); Data safety form (email, health & fitness, app interactions; encrypted in transit; deletable); IARC questionnaire (lands Everyone); target audience 18+; **countries: US only** (the external-payment carve-outs on both platforms are US-court-driven; US-only distribution keeps the Stripe flow in the clearest legal territory on Android too); upload AAB, production rollout.
6. **After build verified: CLAUDE.md Pass 2** (add: four new env vars, key files openExternal.js / delete-account.js / gen-apple-secret.mjs, annual pricing model, locked analytics schema, openExternal rule for all Stripe URLs, Apple secret expiry maintenance note) and run /wrap-session.

**HARD GATE: the TikTok reveal videos do not post until "Download on the App Store" is a live link.** Mobile social traffic converts through store links or not at all. This is the single highest-stakes sequencing rule in the project.

---

## 6. Marketing and growth (week 2 and beyond)

**Marketing plan v1 adopted (June 12).** A one-pager was drafted; recommend committing it to the repo as MARKETING.md so it syncs into project knowledge alongside this doc (NOT yet created). Two framing reforms govern everything below:
- **All external comms are trigger-based on "store link live," never dated.** Nothing posts on a calendar; everything posts off the event that "Download on the App Store" is a live link. This extends the HARD GATE in Section 5.
- **Two-tier bet structure:** the Mines pilot is the launch FLOOR (controllable, high-trust, costs one conversation); the friend's TikTok is the high-variance UPSIDE experiment (uncontrollable, not owned). Plan to the floor; treat the upside as upside.

**Mines athletic department pilot (the launch floor, pitch THIS WEEK in parallel with the build, not after):**
- Remote pitch call this week + follow-up email. Assets drafted: a half-page pitch doc and a pre-written coach announcement. **Coach pitch queued for Monday AM** as the paired market-contact action for this build session (Section 8 behavioral principle).
- Two doors: the coach (primary) and the athletic trainer (parallel/fallback).
- Biggest objection to preempt is disordered-eating / RED-S risk. Pilot design answers it directly: shame-free opt-out, the trainer quietly exempts at-risk athletes, sports med invited to review. Consistent with the eat-enough brand stance (Section 1); coaches and athletic trainers care deeply. Summer base-building is good timing.
- Mechanics (carried): comp accounts (pro_source 'comp' plumbing exists), defined 4-week window, midpoint check-in, two asks at the end (honest testimonial; an App Store review from anyone who genuinely liked it, asking allowed, incentivizing not).
- Fallback: no official yes by ~July 1 means run an informal pilot anyway, Jackson invites 10 to 12 teammates directly.

**Friend TikTok partnership (formalize BEFORE launch revenue exists):**
- Compensation: 15% of net revenue for days 1 to 60, then 25% of attributed first-year revenue via a unique promo code, paid monthly with transparent numbers shown.
- No equity. 7-day no-fault exit either side.
- Disclosure: FTC disclosure on every compensated post; if he is an NCAA athlete, NIL disclosure routed through his school's compliance office.
- One-page agreement drafted. The flat early share knowingly overpays (it includes pilot and Founders revenue he did not drive); accepted for simplicity.
- Channel concentration risk still stands: this is the single greatest marketing asset and it is not owned (relationship dependency: interest, graduation, bans, future payment expectations). Mitigation is the owned channels below.

**Owned channels (built in parallel, zero or low cost):**
- **Jackson's Strava (~200 distance-runner followers), adopted as a zero-cost trust channel:** fueling notes in run descriptions 1 to 2x/week, one overt launch-day post, bio sharpened. An actual collegiate distance runner is the most credible possible source. The activity-append growth loop ("Fueled with TrueCalorie" auto-appended to activities) is PARKED pending Strava API terms review; the read integration is mission-critical and must not be jeopardized.
- **Own TikTok:** warm-up founder-story posts pre-launch with NO download CTA (the reveal gate stays intact). The first warm-up item was cut under week-0 time pressure; rule: warm-up content slips before the pitch call ever does.
- **Email capture on the landing page:** Resend is configured and building no list; every non-signup visitor is currently lost forever. One planned send: the launch announcement.

**Momentum measurement (thresholds written down pre-launch).** App Store attribution is dark, so metrics are channel-agnostic only, read from PostHog: signups/day, activation rate, trial-to-paid vs the ~5% line (Section 7). Do not pretend to know which channel drove an install.

**Product/landing assets that move conversion (carried, still open):**
- Landing page highest-converting missing element: a 10 to 15 second autoplaying loop of voice logging actually parsing a spoken meal, above the fold. Film once on a phone; doubles as the best TikTok clip.
- Post-onboarding voice prompt: end onboarding with "Log your first meal right now. Just say it." Magic moment by design in minute two of account life, not by accident.
- Talk to the one Founder customer: fifteen minutes on why they bought and what almost stopped them beats any further analysis.
- Headline note: "Eating is training." is brand-led; the documented decision is to lead with product quality (voice). Resolution: keep the tagline as kicker, test a voice-led headline once there is traffic to test with. Not a pre-launch priority.

**New open items (June 12):**
- Post-pilot account treatment (do comp accounts convert, expire, or get grandfathered) + the Nutritionix MAU budget those comps consume: decide by pilot week 3.
- "How did you hear about us" onboarding question: post-launch fast-follow (the only first-party attribution signal available given dark App Store data).

**Parked until stores are live:** Stats weight history, water achievement notifications, SEO/prerendered marketing pages (post-launch compounding asset: "calorie calculator for runners," "MacroFactor alternative for athletes"), X/Instagram (low-priority background under "truecalorie").

**Standing rules:** no paid acquisition until organic conversion is proven; no social features until 500+ DAU.

---

## 7. Business model and economics

- Gross margin on subscribers roughly 70%+; Nutritionix cost ~$2.50/MAU/month at the 200 MAU tier ($5,988/yr). Ladder has step functions: $5,988 at 200 MAU, $11,988 at 1,000, $24,000 at 3,000. Costs jump in cliffs while revenue climbs in stairs; plan cash around thresholds. Every active Pro user is by definition an MAU (3+ calls/30 days).
- Founders economics: $79.99 once vs ~$30/yr API cost if active; breakeven ~2.7 years; cap is the only thing making it safe.
- External payments legal basis: post-April 2025 Epic v. Apple ruling, US App Store apps may link out to external payment (Stripe) currently at 0%, presented via system browser; the Epic v. Google injunction (upheld on appeal 2025) opens the same door on US Android. US-only distribution keeps both inside the safe zone. Revisit before any international expansion.
- Trial: no-card maximizes activation data at current scale; conversion now measurable via PostHog; threshold for redesign ~5% trial-to-paid after the pilot.
- Not subject to HIPAA (not a covered entity). Sales tax economic nexus far away; Stripe Tax when justified.

---

## 8. Strategic assessment snapshot (June 10, graded vs solo bootstrapped pre-launch founders)

- **Code: B+.** Right architecture, emerging abstraction discipline (analytics.js, openExternal.js), CLAUDE.md institutional memory. Deficits: zero tests (today's two bugs are the recurring cost), no error monitoring, merges straight to prod (preview deployments exist and are unused).
- **UI/design: A-.** Distinctive, coherent, non-template. Voice review UX is genuinely good. Remaining: emoji icons, small type, post-onboarding aha moment unbuilt.
- **Marketing: C+.** Judgment good (TikTok gate, no paid ads, niche focus); execution is potential energy. One customer, one video, pilot unpitched, zero owned channels, the eat-enough positioning unspoken in copy.
- **Scalability: B.** Stack fine to tens of thousands of users. Real constraints: Nutritionix cost cliffs and Jackson-hours (support/ops do not batch the way engineering does).
- **Business: B.** Pricing architecture now sound; excellent plumbing attached to an unvalidated hypothesis. The Mines pilot is the cheapest experiment on the only question that matters.
- **Security: B.** RLS, verifyUser, webhook signatures, key hygiene all solid. Findings: client-side-only Pro gate on the cost-bearing endpoints (P0), no rate limiting, personal-account 2FA unaudited.
- **Legality: B-.** Privacy policy outdated, Gmail contact; otherwise clean (COPPA language present, deletion over-delivers on the 30-day promise).

**Central risk statement:** a month ago the existential risk was "the app doesn't work on iOS." That is solved. Today the existential risk is "nobody finds out it exists, and no one has confirmed they want it." The build:sell ratio must invert over the next 30 days.

**Behavioral principle (self-imposed):** engineering tasks have clear completion states and no rejection risk; selling has neither, so the punch list refills itself forever while market contact slides. Rule: pair every build session with one market-contact action (a pitch sent, a user conversation, a piece of owned content).

---

## 9. Key learnings and principles (cumulative)

New from June 15:
- **www-vs-apex is now load-bearing in a FOURTH place: the Strava redirect_uri.** Every URL that leaves native and comes back (Stripe webhook, native /api base, native checkout success/cancel, and now the Strava OAuth redirect) must target www directly and never the apex. Make this the default for any new external return URL.
- **A stale PWA service worker caches per-origin and persists across deploys, masking correct server/config.** In iOS Safari it intercepted the Strava redirect on the apex origin and served an old cached shell, so the server route never even ran (the absence of a strava-callback log meant "never ran," not "failed"). Localize by comparing two clients (the apex 301 worked on desktop but not on the cached phone); clear site data when a native web flow behaves impossibly. Same shape as the achievements bug this session (the caller passed only logged days; the callee assumed a gap-filled calendar): silent disagreements at a boundary survive the longest, whether the boundary is client/server, cache/origin, or caller/callee.
- **Scroll bounce re-confirmed unfixable via CSS/config** (native scrollView.bounces=false; needs per-build Swift). Stays parked (P2 #11). The app already has a full keyframe animation layer; "polish" is not an animation overhaul, so do not ship a no-op CSS "fix" for the bounce.

New from June 14:
- **"TestFlight Internal Only" builds can never be submitted for review.** Xcode's Distribute App offers it as a distribution choice, but those builds are internal-testing-only and show greyed out in the App Store Connect build picker. Submitting requires choosing "App Store Connect" distribution, and the build number must exceed the highest already uploaded. `cap add ios` resets the build number to 1 each MacinCloud session, so bump it manually every build. Builds 27-31 were silently wasted this way before build 32 (the first App-Store-eligible one).
- **Two asset pipelines, do not conflate them.** Web assets (favicon, icon-192/512) are committed static files in /public, served by Vercel, and update on a normal push. Native app icons generate into the gitignored ios/ each build via @capacitor/assets, so their source lives in committed assets/icon-only.png and must be re-stamped per MacinCloud session (`capacitor-assets generate --ios`), the same per-session pattern as patch-plist.sh. A web push updates the favicon/PWA icon; only a native rebuild updates the app icon.
- **Canonical-domain mismatch silently breaks native; this was the real root cause of the whole native-POST saga.** A mid-request 301 redirect (apex truecalorie.net to www.truecalorie.net) is invisible on web (same-origin relative URLs) and to Supabase (its own domain, no redirect), but it kills native cross-origin calls: plain fetch returns status 0 and CapacitorHttp downgrades POST to GET. Point native at the exact host that serves without redirecting. www-vs-apex is now load-bearing in three places (Stripe webhook, native API base, this) — extended to a fourth, the Strava redirect_uri, on June 15. Corollary: the June 13 "CapacitorHttp downgrades POST to GET" learning was a real symptom but not the root cause; plain fetch against the apex would also have failed (status 0). Fixing the host was the actual fix.
- **iOS scroll bounce is a native default, not a CSS/config setting.** Capacitor hardcodes `scrollView.bounces = false` in CAPBridgeViewController.swift; no CSS (overscroll-behavior, html/body rules) and no Capacitor 8.4.0 config can re-enable it. Re-enabling requires native code after bridge load. Don't ship a no-op CSS/config "fix" for it. (Decision: parked post-launch; Section 4 P2 #11.)

New from June 13:
- **The Capacitor-plugin externalize trap.** A plugin left in rollup `external` and dynamically imported with /* @vite-ignore */ keeps a bare module specifier in the built JS that the WKWebView cannot resolve; it throws at runtime and silently kills whatever registered in that effect (here, the appUrlOpen sign-in listener). Only externalize packages you never call on the platform. If a plugin runs at runtime it must be a real dependency and bundled by Vite. @capacitor/app was not even in package.json.
- **Supabase native OAuth returns the implicit-token (hash) format, not ?code=.** Parse #access_token/#refresh_token from the URL hash and call supabase.auth.setSession; exchangeCodeForSession is only the fallback. The earlier code-only handler is why sign-in silently no-op'd even once the listener registered.
- **CapacitorHttp downgrades POST to GET on iOS** (confirmed under both the global fetch patch and explicit CapacitorHttp.request; method+body lost, server sees GET). It is not viable for our POSTs. The proven native transport is plain browser fetch + server CORS — Supabase makes the identical cross-origin call from the same WKWebView and succeeds.
- **eruda gated by `window.location.hostname === 'localhost'` is the reliable on-device debug-console trigger.** The Capacitor bridge (window.Capacitor.isNativePlatform) may not be ready at startup; hostname always is, and is localhost in the WKWebView and local dev but never on truecalorie.net. Temporary scaffolding only.
- **Debug on device via window.alert, not console.log.** With no tethered Mac this session, alert() (and a truncated format string instead of dumping full URLs) was the only reliable on-screen probe — but it printed live auth tokens, hence the rotation owed. Strip before submission.

New from June 11:
- **Rate limiting is fail-open by design.** A cost/abuse cap must log-and-continue if its own DB read/write fails, never block a paying user. The gate that protects revenue (is_pro 403) is a separate, hard-failing check. Keep the two concerns distinct.
- **Rate-limit reset windows use UTC deliberately** (server-deterministic). This is the one place the local-date rule does not apply: a reset window is an abuse cap, not user-facing day grouping. Compute it with an explicit getUTC* helper so the banned toISOString().split idiom is never used.

New from June 10:
- **Merge vs push:** feature branches are scratch paper; local merge folds them into local main; push sends main to GitHub, which is what triggers Vercel. CLAUDE.md's "never push to main without go-ahead" is the checkpoint, and Claude Code merging locally then waiting for push approval is the correct flow.
- **The stale-caller bug class:** when a server contract changes, grep for and update EVERY caller in the same commit; two production bugs came from exactly this during the June 4 security pass. Tests are the systematic fix.
- **Apple OAuth debugging map:** error AFTER the Apple login page = Supabase-to-Apple secret/client exchange failing (check Supabase auth logs; invalid_client = the Client ID in Supabase does not match a registered Services ID). Error BEFORE the login page = the Services ID itself does not exist or has no domain configured. The Services ID actually registered is net.truecalorie.auth.
- Apple's Domains field takes bare hostnames (no https://) and rejects API-endpoint subdomains; Return URLs take full https URLs.
- The Apple client secret JWT lives at most 180 days; regeneration is a recurring maintenance item with a calendar reminder.
- Vercel builds a preview deployment for every pushed branch; test the preview URL before merging user-facing changes.
- e.currentTarget over e.target for handlers on elements with children; ref pattern (refreshRef.current) for calling unstable-identity functions from long-lived native listeners; the  glyph is Apple-fonts-only, use inline SVG.
- Server-side enforcement principle: hiding a button is not a gate. Any invariant that costs money (Nutritionix calls) must be enforced in the endpoint, not the UI.
- Webhook is ground truth for money; revenue analytics fire server-side, never from the browser.
- Abstraction layers (analytics.js, openExternal.js): route cross-cutting behavior through one file so future changes touch one place.

Carried forward (still binding):
- Confirm commit hashes after every Claude Code step (phantom-debug lesson).
- VITE_ env vars must be manually exported on MacinCloud; missing one fails silently as a black screen. The master block now has FOUR exports including VITE_POSTHOG_KEY.
- App.entitlements is not in git; recreate manually each MacinCloud session.
- ./node_modules/.bin/cap sync over npx cap sync on the cloud Mac; Capacitor CLI drops out of node_modules when packages change.
- Strava calories unreliable without HR; estimateCalories helper must exist in BOTH strava-activities.js and strava-training.js.
- Adaptive target uses 3-day trailing average excluding today (evening-runner refueling design; do not re-litigate).
- RLS subquery join pattern for recipe_ingredients is required; Supabase SQL migrations run manually before Claude Code.
- IDOR pattern: endpoints never trust client-supplied userId; lib/verifyUser.js Bearer verification everywhere.
- Stripe: period end at subscription.items.data[0].current_period_end (Basil+ removed the top-level field); create-checkout-session expects userEmail; webhook needs bodyParser:false.
- .maybeSingle() not .single(); usePro() at top of component, guard with if (loading) return null.
- No em dashes in user-facing copy. Date grouping via toLocalDateStr, never toISOString().split.

---

## 10. Approach and patterns

- Claude Code on Windows with CLAUDE.md as binding law: scope/plan first, feature branch, minimal precise edits with diffs, grep the whole repo for the same pattern when fixing bugs, npm run build before done, never push to main without explicit go-ahead.
- Jackson reviews every diff and confirms every hash. He is a non-coder operating as technical director: he cannot write the code but can review, question, and catch issues; explanations should build transferable mental models (analogies work well).
- Code changes for Windows and Xcode/Info.plist steps for MacinCloud stay clearly separated; all Xcode-requiring work batches into single MacinCloud sessions.
- This doc is updated surgically via /wrap-session at the end of each significant session; git history is the version record. CLAUDE.md gets targeted passes (Pass 2 pending, see roadmap item 6).
- **Sector-allocated chats (new):** Jackson is splitting work across dedicated chats per sector (e.g., native/build, marketing, business). Every sector chat should read this document first, search project knowledge before assuming file state, and keep the analytics schema and pricing decisions locked unless this doc is superseded.
- **Project knowledge is now sourced solely from the synced repo (June 11).** The standalone context upload was deleted; CONTEXT.md and the wrap-session skill reach claude.ai only via repo sync. Loop verified end to end: a sector chat retrieved CONTEXT.md (June 11 header) and the wrap-session skill from synced knowledge. Implication: this doc must be pushed and "Sync now" clicked for chat-side knowledge to update; there is no second source to fall back on.
- Feature prioritization is business-impact ordered: revenue/retention blockers first, then polish. Currently: store launch track outranks all features.

---

## 11. Accounts, env vars, and operational reference

**Env vars (names only, values in Vercel):**
- Client (VITE_, baked at build time, must also be exported on MacinCloud): VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_NUTRITIONIX_APP_ID, VITE_NUTRITIONIX_APP_KEY, VITE_STRAVA_CLIENT_ID, VITE_STRIPE_FOUNDERS_LINK, VITE_USDA_API_KEY, VITE_APP_URL, **VITE_POSTHOG_KEY (new)**
- Server: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, **STRIPE_PRICE_ID_MONTHLY (new)**, **STRIPE_PRICE_ID_ANNUAL (new)**, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY, NUTRITIONIX_APP_ID, NUTRITIONIX_APP_KEY, STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET, PORTAL_RETURN_URL, **POSTHOG_KEY (new)**

**MacinCloud master export block (updated June 10):**
```
export VITE_SUPABASE_URL="..."
export VITE_SUPABASE_ANON_KEY="..."
export CAPACITOR_BUILD=true
export VITE_POSTHOG_KEY="phc_..."
```

**Apple reference:** Team ID and Key ID recorded with the .p8 (stored locally, gitignored). Services ID net.truecalorie.auth. Secret regeneration: scripts/gen-apple-secret.mjs, paste output into Supabase Apple provider. Reminder: November 10, 2026.

**Stripe reference:** old hardcoded monthly price was price_1TcCMTRz19liVCNXQmgD2VVM (now STRIPE_PRICE_ID_MONTHLY). Founders is a Stripe Payment Link (VITE_STRIPE_FOUNDERS_LINK).

**Key new files since June 8:** src/analytics.js, src/lib/openExternal.js, api/delete-account.js, scripts/gen-apple-secret.mjs. June 13 additions: src/lib/apiUrl.js (native API base prefix — now https://www.truecalorie.net as of June 14, 6a922a1), src/lib/apiFetch.js (native API transport wrapper — now plain fetch on every platform as of June 14, 11a5511; CapacitorHttp removed), lib/cors.js (applyCors + CORS_HEADERS for all client endpoints), scripts/patch-plist.sh (idempotent Info.plist patcher). @capacitor/app added as a dependency. June 14 additions: assets/icon-only.png (1024 charged-bolt mark, the @capacitor/assets source for native icon generation); @capacitor/assets added as a devDependency; /public favicon.svg + favicon.ico + icon-192.png + icon-512.png replaced with the charged-bolt mark; eruda removed (uninstalled).

**Supabase tables (rate limiting):** api_rate_limits, added June 11. PK (user_id, date, endpoint), call_count int, RLS on with a service-role-only ALL policy. Backs the daily caps on /api/voice-log (25/user/day) and /api/restaurant-search (75/user/day); UTC reset window; fail-open on DB error. SQL migrations are still run manually in the Supabase SQL editor before deploy.

**Calendar items:** Nov 10 2026 Apple secret regen; close Founders at 100 spots or 30 days post-launch; watch Nutritionix MAU count monthly.
