# TrueCalorie Context Document
Last updated: June 20, 2026 (repo unchanged at 193f70c code on main; HEAD 2025afe is docs-only; no new code commits, strategy/operational state only). This June 20 update adds: Supabase Security Advisor hardening complete, Vercel Hobby->Pro decision, the ambassador/partnership track (Reed/Wes/Sam/Olympian), both contractor agreements signed (Isaiah + Cole), founder-customer call done, first IG Reel live, the referral-code system reclassified as buildable-now, the money/ops plan (CPA-first), and the product-level RED-S responsibility item. Prior context: June 17 part 1 covered marketing positioning, Isaiah content contractor, Mines coach call, and the shared individual-vs-organization developer-enrollment root cause on both app stores; part 2 added the Nutritionix paid-plan decision (do not buy pre-revenue), the plan to launch without Nutritionix (voice runs on Haiku; restaurant search shelved), the confirmed native architecture (bundled UI + remote backend), and a security review. 1.0 build 35 remains in App Review with manual release. This file is the single canonical copy of project state. Version history lives in git: `git log -- CONTEXT.md`. This file is updated only via the /wrap-session command; do not edit it ad hoc.

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
- **Voice:** webkitSpeechRecognition in browser/WKWebView (iOS 16.4+) -> /api/voice-log. **Corrected understanding (June 17): Claude Haiku runs on EVERY voice log** (it is the clarifying-question / parse layer, temperature 0), regardless of pro status. Nutritionix supplies nutrition data only for non-trial paying Pro users; trial users already run the full Haiku voice path. **If Nutritionix keys are absent, voice auto-falls back to Haiku for everyone**, so the voice centerpiece does not depend on a Nutritionix plan. No native speech plugin; deliberately removed for Capacitor 8 SPM incompatibility.
- **Native:** Capacitor (iOS + Android). ios/ regenerated each MacinCloud session, never committed. @capacitor/browser now wired for external Stripe URLs. **Architecture confirmed June 17 from capacitor.config.json: webDir is "dist" and there is NO server.url, so the native app BUNDLES its web UI (frozen into the binary per build) while the backend (/api, Supabase, Vercel env) is remote over the network.** Working rule: UI/frontend changes need a rebuild + resubmit; backend changes deploy instantly via Vercel with NO resubmit. "Every small change needs a resubmit" is false — only bundled-UI changes do.
- **Analytics:** PostHog (US cloud), client via posthog-js through src/analytics.js, server via posthog-node in stripe-webhook
- **Auth providers:** email/password, Google OAuth, Sign in with Apple (web OAuth flow, live as of June 10)
- **Integrations:** Strava OAuth + activities; push notifications via Vercel cron 19:00 UTC
- **Email:** Resend SMTP on truecalorie.net via Namecheap DNS (configured, currently unused for marketing)
- **Repo:** GitHub TrueCalorie/TrueCalorie, Claude Code with CLAUDE.md as binding conventions

---

## 3. Current state (end of day, June 20, 2026)

### Operational state (no git record), June 20, 2026

HEAD unchanged at 2025afe (docs); no code shipped this session. All items below are operational/infrastructure/strategy state.

- **Supabase Security Advisor hardening COMPLETE.** Revoked vestigial EXECUTE grants on `handle_new_user` and `link_founder_on_signup` (trigger functions that never needed direct client EXECUTE). Enabled Auth leaked-password protection. Down to **2 intentional warnings**, both on the public `founder_count()` RPC: kept SECURITY DEFINER + public grant BY DESIGN, because switching it to SECURITY INVOKER breaks the pre-login "spots remaining" display (an unauthenticated visitor must be able to read the count). **0 errors.** This closes the Security Advisor pass.
- **Vercel Hobby -> Pro: PURCHASING (decided).** Rationale is commercial-use compliance: the Hobby tier is non-commercial and hard-caps by going OFFLINE at the limit, whereas Pro bills overage instead of dropping the site. TODO before high-traffic reveal: **set Vercel spend/budget alerts** (Pro now bills overage, so an uncapped spike costs money silently). Tracked as a pre-launch seatbelt (Section 4 P1).
- **Bluevine business checking confirmed OPEN since LLC formation** (corrects a prior note that implied it was still to-do). The separate-business-account piece of the money/ops plan (Section 7) is therefore already in place; remaining is linking Stripe <-> Bluevine.
- **Both contractor agreements SIGNED (Isaiah + Cole), stored in OneDrive.** Cole **W-9 still outstanding** (needed before paying him; 1099-NEC if paid $600+/yr). Isaiah = content-production flat-fee contractor; Cole = TikTok distribution revenue-share contractor (Section 6).
- **Expense tracker built:** TrueCalorie-Expenses.xlsx with three sheets (Subscriptions / Expenses log / Summary). Backs the bookkeeping discipline the CPA consult will formalize.

### App Store: build 35 in review, build 32 superseded (June 16, 2026)

No git changes this session; this is all App Store Connect operational state. HEAD unchanged at 193f70c (code), 8d87abe (last docs/wrap commit).

- **Build 32 is BROKEN and superseded. Do NOT release it.** Strava OAuth plus other functionality regressed in it. TODO: confirm build 32 is fully cleared in App Store Connect so it can never be released by accident.
- **Build 35 is now the build in review for 1.0**, with **manual release** still set. It is build 34's code with no meaningful changes, re-archived with **"App Store Connect"** distribution. Build 34 had been uploaded as **"TestFlight Internal Only"** and was therefore unsubmittable: the documented landmine recurred (same failure as builds 27-31). Build-number discipline held (32 to 34 to 35).
- **Next on build 35:** await the verdict. On a **3.1.1 bounce**, reply in the Resolution Center citing the US-storefront basis (do NOT resubmit blind). On approval, **release manually** to fire the launch. The HARD GATE (no TikTok reveal until the App Store link is live) still holds.
- **support@truecalorie.net delivery CONFIRMED working end to end.** Closes the open submission item and the remaining support-inbox piece of P0 #2 (the privacy/Terms legal contact now provably reaches a monitored inbox).
- **Exposed user session tokens (June 13 OAuth debug alerts) RESOLVED by deleting the affected account.** Deleting a user revokes the session (kills the long-lived refresh token) and removes the data, which neutralizes the leak. Deletion, not elapsed time, is what closes it. STILL TO CONFIRM: that the account was in fact deleted, and that it was a throwaway and not a real beta user. If both hold, the P0 token item is fully closed (see Section 4 P0 #2).

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

### 1.0 SUBMITTED to App Review (June 14, 2026) — [build 32 SUPERSEDED June 16; broken, do not release. Build 35 is the build now in review. See the June 16 block above. The as-submitted metadata/privacy labels below still apply.]

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
2. **[RESOLVED June 16, CONFIRMED CLOSED June 17] Exposed Supabase session tokens.** Live access and refresh tokens were printed in on-device debug popups and appeared in screenshots during the June 13 session. The token-printing debug alerts were removed June 14 (ceec784, P2 item 9), so no new exposure occurs. The already-exposed session was neutralized June 16 by **deleting the affected account**, which revokes the session (kills the long-lived refresh token) and removes the data. Revocation, not elapsed time, is the mitigation: a leaked Supabase session is a ~1-hour access token PLUS a long-lived refresh token, so "expires in an hour" only covered half the risk (see Section 9). **Confirmed June 17: the affected account was a throwaway and was 100% deleted (session revoked). Fully closed.**

The two prior P0 items (server-side Pro gate on Nutritionix endpoints, 74adc61; privacy policy + Terms update, 43017ad/4ad37ad) shipped June 11 and are recorded in the Section 3 shipped table. One residual from the privacy item, routing support@truecalorie.net to a monitored inbox, is tracked under App Store submission in the roadmap (Section 5, item 4).

### P1, soon after launch

_Reframed June 17, extended June 20: the PRE-LAUNCH seatbelts below are not 1.1 features. They gate real money flowing, so they ship before the store link goes live, not after. The June 20 set is consolidated: Sentry (#1), global daily spend ceiling (#1b), Vercel spend/budget alerts (#1c), and linking Stripe <-> Bluevine (#1d)._

1. **No error monitoring (PRE-LAUNCH seatbelt).** PostHog shows what users do; nothing reports when code breaks. A failing webhook is silent until a customer complains, and a silent webhook failure costs an early customer real money. Sentry free tier, ~30 min, one session. Do this before real money flows.
1b. **Global daily cost ceiling unconfirmed (PRE-LAUNCH seatbelt).** Per-user daily caps exist (api_rate_limits: voice-log 25/day, restaurant-search 75/day), but there is NO confirmed GLOBAL daily cost ceiling across all users. Open card-free signup makes mass-account Nutritionix-cost abuse possible (create many accounts, each under its per-user cap). Confirm whether a global cap exists; if not, add one before launch. Earlier notes flagged the absence of a global cap as critical. (Lower urgency while restaurant search is shelved and voice runs on Haiku, but still the structural hole.)
1c. **Vercel spend/budget alerts unset (PRE-LAUNCH seatbelt, new June 20).** The Hobby->Pro move (Section 3) trades "goes offline at the cap" for "bills overage." That removes the hard ceiling, so an uncapped traffic spike now costs money silently. Set spend/budget alerts before any high-traffic reveal.
1d. **Stripe <-> Bluevine not yet linked (PRE-LAUNCH seatbelt, new June 20).** Bluevine business checking is open (Section 3); payouts still need to route from Stripe into it before live revenue flows.
2. **No automated tests. [Reinforced June 17 as the single biggest structural gap.]** Today's two stale-caller bugs are the recurring cost. The June 17 security review named this the direct antidote to "a hidden bug I can't see": code review is a snapshot, tests are the durable safety net, and the absence of tests over the trust boundaries is exactly what let the two June-10 production bugs (portal button, upgrade modal) ship. Mitigation that fits the workflow: a Claude Code-written smoke-test suite for API endpoints (auth rejection, checkout returns URL, webhook parses sample event), run before every merge. Highest-value de-risking build.
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
15. **1.1 features/polish deliberately DEFERRED to a real 1.1 (June 17).** Weight history, water achievement notifications, animation overhaul, and scroll bounce (P2 #11) are all parked for a real 1.1 release. Decision: do not gold-plate pre-launch. Distinct from the two PRE-LAUNCH seatbelts in P1 (error monitoring, global cost ceiling), which DO ship before launch.
16. **Landing-page email capture still leaks every non-signup visitor (June 17).** Resend is configured but builds no list; every non-signup visitor is lost forever (also noted in Section 6). Timely but lower-leverage than demand work; add as a small task before real traffic arrives.
17. **Haiku voice-quality self-test (OPEN ACTION, June 17).** Before committing to the launch-without-Nutritionix plan (Section 5), Jackson should test the Haiku voice experience himself. He has been on the Nutritionix path as a paying Pro user, but most launch users get Haiku, so he needs to confirm it is good enough to lead with. If noticeably weaker than Nutritionix, revisit the plan.
18. **Low-severity security hardening (surfaced June 17, NOT urgent, right-sized).** (a) Strava OAuth `state` is a bare user ID, not a signed single-use nonce — low severity given read-only scope and a narrow account-linking CSRF window. (b) The api_rate_limits counter is non-atomic (SELECT-then-UPDATE/INSERT) — trivial: a few extra calls under concurrency, pennies at scale. Neither blocks launch; harden opportunistically.
19. **PRODUCT-level RED-S / disordered-eating responsibility (raised June 20; distinct from any one ambassador).** The app's audience skews high-RED-S-risk, and unlike Sam (who has a nutritionist) MOST users will have no professional in their corner. Owed: get a sports-dietitian / RED-S-aware professional's eyes on how the app itself, AND any RED-S-framed promotion, handles this population. Ties directly to the eat-enough brand stance (Section 1), Terms/Privacy liability (the binding reason to engage a lawyer per Section 5 item 7), and wellbeing positioning. This is the product/duty-of-care counterpart to the marketing-side caution already applied to Sam's health story (Section 6 ambassadors).

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
4. **App Store submission: [IN REVIEW June 16 — 1.0 build 35, manual release. Build 32 was broken and is superseded (build 34 was internal-only/unsubmittable; 35 is 34's code re-archived for App Store Connect). See the June 16 block at the top of Section 3. The as-submitted name, keywords, age rating, and privacy labels in the June 14 block supersede the planning below; these bullets are retained as the planning record and for the next submission.] Open: confirm build 32 is fully cleared in App Store Connect; await the build 35 verdict; on a 3.1.1 bounce reply in Resolution Center citing the US-storefront basis (do not resubmit blind); on approval release manually.**
   - **[DONE June 16] support@truecalorie.net delivers to a monitored inbox, confirmed end to end.** It is the privacy policy and Terms legal contact; the reviewer-emails-a-dead-address risk is closed.
   - Name: "TrueCalorie - Macro Tracker". Subtitle: "Calorie tracking for athletes". Keywords (100 chars, no spaces, no title-word repeats): counter,running,strava,protein,nutrition,marathon,weightlifting,food,log,voice,runner,fuel
   - Screenshots (6.9" set, order is the argument): 1 voice logging mid-parse, 2 adaptive target raised after a synced run, 3 daily ring, 4 Trends, 5 fueling gauge
   - Privacy labels: Contact Info (email), Health & Fitness, Identifiers (User ID), Usage Data (Product Interaction); linked to user, NOT used for tracking (no ATT needed)
   - App Review info: demo account reviewer@truecalorie.net with pro_source 'comp'; notes: full-access demo provided, mic permission needed for voice, Strava optional, "Purchases use external payment links in compliance with the App Review Guidelines for the United States storefront." If rejected on 3.1.1 anyway, reply in Resolution Center citing the post-Epic US guideline update; do not resubmit blind.
   - Age rating lands 4+; answer No to unrestricted web access.
4b. **Launch WITHOUT a paid Nutritionix plan (decided June 17).** Voice (the centerpiece) survives intact on Haiku (see Section 2 corrected understanding); restaurant search is the ONLY hard Nutritionix dependency (grep-confirmed: voice-log.js has a Haiku fallback, restaurant-search.js does not). Plan: shelve restaurant search until revenue justifies the plan. **Do NOT pull the in-review build 35 over this — let it ride.** Two-step mechanics, leaning on the bundled-UI/remote-backend split (Section 2):
   - **(1) Backend stopgap, NO resubmit, works on build 35 now:** make /api/restaurant-search return a clean "coming soon" response instead of erroring when no key is present. Bonus: it stops calling Nutritionix entirely, protecting the demo allowance.
   - **(2) Clean fix, batched into the NEXT native build:** bake a server-read feature flag so the UI can hide/gray restaurant search by a server value, then toggle it (off now, on the day Nutritionix is purchased) with no resubmit ever.
   - Gated on the open Haiku self-test (Section 4 P2 #17): confirm the Haiku voice experience is good enough to lead with before committing.
4c. **Referral-code system — RECLASSIFIED buildable NOW (June 20), NOT a v1.1 item.** Earlier it was filed as post-launch; corrected. It is Stripe + checkout only (no native build, no resubmit), so it ships from Windows via Vercel like any backend change. It is the RAILS every performance-based ambassador deal needs (Wes's referral-code + signup-kickback model, and any future code-driven deal). Reframed as the highest-leverage IN-CONTROL pre-launch work: unlike demand, it depends on nobody else. Build it before the ambassador structures need it.
4d. **Supabase custom-domain client switch — DEFERRED to v1.1 (June 20), explicitly NOT a pre-launch task.** VITE_SUPABASE_URL still points at the raw Supabase host, not auth.truecalorie.net. Because VITE_ vars bake at BUILD time, a clean switch needs a fresh native build, so this is NOT a pre-launch queue reset. **Launch build 35 as-is.** Park the client-URL switch for a real 1.1 rebuild. (The custom auth domain itself exists; only the client's VITE_SUPABASE_URL still uses the raw host.)
5. **Play Store — PARKED as a background task (updated June 17). Android does NOT gate launch; iOS is the launch trigger.**
   - **Play Console app CREATED June 17:** "TrueCalorie: Athlete Nutrition", package **net.truecalorie.app (permanent, cannot change)**, Free, US-only intended. (Prior CONTEXT state was "listing incomplete"; in fact the app did not exist yet, so this is forward progress, not the resume point it looked like.)
   - **BLOCKER discovered June 17:** personal Play accounts created after Nov 13 2023 must run a closed test with **12 testers opted in for 14 consecutive days** before applying for production access. Jackson has ~4 Android contacts, so the standard path is blocked. Android is a minimum of **2+ weeks out and the clock has not started.** Decision: PARKED.
   - **Unblock path:** organization (LLC) Play accounts are EXEMPT from the 12-tester rule. See the combined org-enrollment decision below (shared root cause with the Apple individual-enrollment issue). Parked as a deliberate post-launch decision.
   - Android developer verification: identity on file; package name registered as Draft; public-key upload (for the Sept 2026 requirement) deferred, not launch-blocking.
   - Listing work still owed when Android resumes (carried): store assets (reuse iOS screenshots; 512 icon; 1024x500 feature graphic); privacy policy URL + account-deletion link (exists); Data safety form (email, health & fitness, app interactions; encrypted in transit; deletable); IARC questionnaire (lands Everyone); target audience 18+; **countries US only** (external-payment carve-outs are US-court-driven; US-only keeps the Stripe flow in the clearest legal territory on Android too); upload the existing signed AAB, production rollout.

   **Combined post-launch decision — convert both developer accounts from individual to LLC organization enrollment (June 17).** Both app-store annoyances share ONE root cause: the dev accounts are enrolled under Jackson personally, not TrueCalorie LLC. (a) **Apple:** the App Store listing shows Jackson's personal legal name, not "TrueCalorie LLC," because it is an individual enrollment. No setting fixes this; it requires converting to an organization enrollment (D-U-N-S number, multi-step). NOT done now (mid-review). (b) **Android:** an org Play account is exempt from the 12-tester wall. Converting both to LLC org accounts would put the brand name on the iOS listing AND skip the Android closed-test requirement. Parked as ONE combined post-launch decision.
6. **After build verified: CLAUDE.md Pass 2** (add: four new env vars, key files openExternal.js / delete-account.js / gen-apple-secret.mjs, annual pricing model, locked analytics schema, openExternal rule for all Stripe URLs, Apple secret expiry maintenance note) and run /wrap-session.
7. **Technical director education track (post-launch; sequenced AFTER store launch + Mines pitch).** Flagged as a comfort-zone substitution risk under the Section 8 paired-action rule: do not let it displace launch + pitch. Two tracks:
   - **(a) Codebase/backend literacy.** Method: trace real paths on the LIVE app when real things happen. Jackson traces first, Claude corrects/extends, not Claude lecturing. Launching accelerates this (the live app is the curriculum).
   - **(b) Legal/financial compliance.** NOT a reason-from-principles topic; binding answers come from a CPA (and a lawyer for contracts), timed to when revenue starts, not pre-launch. Claude provides the map and the questions only. **First action: one small-business CPA consult for quarterly estimated taxes + bookkeeping.** Supporting frame: fraud/evasion require intent; good-faith founders get penalty-shaped problems (surprise bills, late filings, missed registrations), fixed by a separate business bank account (which also preserves the LLC liability shield), setting aside a % of profit, paying estimates quarterly, and never commingling funds. SaaS sales tax is per-customer-state and scales with revenue; nexus is far off; Stripe Tax automates it when justified. Paying the TikTok friend a rev share likely makes him a contractor: W-9 + 1099-NEC if $600+/yr; flag to the CPA before money flows.

**HARD GATE: the TikTok reveal videos do not post until "Download on the App Store" is a live link.** Mobile social traffic converts through store links or not at all. This is the single highest-stakes sequencing rule in the project.

---

## 6. Marketing and growth (week 2 and beyond)

**Marketing plan v1 adopted (June 12).** A one-pager was drafted; recommend committing it to the repo as MARKETING.md so it syncs into project knowledge alongside this doc (NOT yet created). Two framing reforms govern everything below:
- **All external comms are trigger-based on "store link live," never dated.** Nothing posts on a calendar; everything posts off the event that "Download on the App Store" is a live link. This extends the HARD GATE in Section 5.
- **Two-tier bet structure:** the Mines pilot is the launch FLOOR (controllable, high-trust, costs one conversation); the friend's TikTok is the high-variance UPSIDE experiment (uncontrollable, not owned). Plan to the floor; treat the upside as upside.

**Mines athletic department pilot (the launch floor, pitch THIS WEEK in parallel with the build, not after):**
- Remote pitch call this week + follow-up email. Assets drafted: a half-page pitch doc and a pre-written coach announcement. **The coach call HAPPENED June 17: strong interest, loves the concept.** The ask = credibility + honest feedback + an endorsement/statement. **The endorsement must stay UNPAID** (a paid coach endorsement is an NIL/compliance issue, unlike Cole's revenue-share deal); the coach must clear it with his compliance officer. **Recap email with the app link drafted and SENT from the company domain, cc the assistant coach** — sending from the company email rather than the school email was deliberate to keep the commercial/school boundary clean under compliance review. The coach will evaluate the stable web app and route through compliance. The launch-floor experiment is in motion, running in parallel with the build per the Section 8 paired-action rule.
- Two doors: the coach (primary) and the athletic trainer (parallel/fallback).
- Biggest objection to preempt is disordered-eating / RED-S risk. Pilot design answers it directly: shame-free opt-out, the trainer quietly exempts at-risk athletes, sports med invited to review. Consistent with the eat-enough brand stance (Section 1); coaches and athletic trainers care deeply. Summer base-building is good timing.
- Mechanics (carried): comp accounts (pro_source 'comp' plumbing exists), defined 4-week window, midpoint check-in, two asks at the end (honest testimonial; an App Store review from anyone who genuinely liked it, asking allowed, incentivizing not).
- Fallback: no official yes by ~July 1 means run an informal pilot anyway, Jackson invites 10 to 12 teammates directly.

**Friend TikTok partnership (Cole) — AGREEMENT SIGNED June 20:**
- The distribution contractor is **Cole.** His revenue-share agreement is **SIGNED and stored in OneDrive** (alongside Isaiah's). **OPEN: Cole W-9 still outstanding** (collect before paying him; 1099-NEC if paid $600+/yr). This is the distribution rev-share track (vs Isaiah's flat production fee).
- Compensation: 15% of net revenue for days 1 to 60, then 25% of attributed first-year revenue via a unique promo code, paid monthly with transparent numbers shown. (The referral-code system in Section 5 item 4c is the rails this needs.)
- No equity. 7-day no-fault exit either side.
- Disclosure: FTC disclosure on every compensated post; if he is an NCAA athlete, NIL disclosure routed through his school's compliance office.
- One-page agreement drafted then signed. The flat early share knowingly overpays (it includes pilot and Founders revenue he did not drive); accepted for simplicity.
- Channel concentration risk still stands: this is the single greatest marketing asset and it is not owned (relationship dependency: interest, graduation, bans, future payment expectations). Mitigation is the owned channels below.

**Ambassador / athlete-influencer track (new June 20).** A separate channel from Cole (paid distribution) and Isaiah (paid production): unpaid/comp athlete advocates. Governing rule, learned hard this session: **separate deals are separate tracks; do not route multiple relationships through one conversation** (Section 9).
- **Cast.** **Reed** = intermediary (~1.3K, U. Neb. Kearney; post-for-product barter) who introduced Wes and set up the Wes group chat. **Wes Ferguson** = pro runner; runs flat-fee paid sponsorships. **Sam Castle** = ~1K, Wyoming track; genuine free organic enthusiast.
- **Reed — CLOSED.** Promotes for a free comp account, no pay, pure goodwill. Done.
- **Sam — CLOSED to a comp/organic relationship.** Call done. Genuine enthusiast; will post across IG / YouTube / X. Kept ORGANIC: comp account as goodwill, invited to TestFlight to build content pre-launch (post only AT launch, gate intact). Sam disclosed a RED-S history; his nutritionist recommended exactly this kind of tool (one that is not a chore and pushes eating ENOUGH — adequate fueling, not restriction). He is trialing a few days before deciding to promote. **Handling stance (important): the nutritionist is the authority — defer to her; Sam's health story is HIS to tell with her in the loop, NOT a marketing hook.** With a genuine fan the risk is over-managing and deflating enthusiasm, so the job here is relationship + honest feedback + launch coordination, not negotiation. Sam-specific RED-S concern resolved (the PRODUCT-level RED-S item, Section 4 P2 #19, is the separate, broader duty).
- **Wes — OPEN, unverified.** Declined his flat-fee model (wrong for a pre-revenue, just-formed LLC); Jackson wants performance-based instead (referral code + signup kickback — needs the Section 5 item 4c rails). A phone call was set up via Reed's group chat, but **Wes himself has stayed silent** (Reed set it up, not Wes), so the FIRST job of the call is confirming Wes genuinely uses and likes the app before ANY structure talk. A stronger independent line exists for an unfiltered read (a former Mines teammate, same HS, who competed with Wes) and is NOT "leapfrogging" Reed (using your own connection is not cutting an intermediary out of an intro they control). Posture: lead as an equal offering something, not a supplicant.
- **Olympian (~30K) followed organically — HOLD, no pitch.** No outreach was made; the follow is a niche-validation signal, not interest. Pitching pre-launch reads desperate. Followed back to keep the door open. Revisit post-launch with a concrete reason. (This needs a written trigger or it evaporates — see the Section 9 learning.)

**Content contractor: Isaiah (new June 17).**
- Isaiah is a former Mines teammate (hammer thrower) who ran the team Instagram and is a strong editor (outshone the paid school media guy); he also has culinary skills (a future athlete-recipe content lane). Remote for the foreseeable future; good phone contact.
- Engaged as a content PRODUCTION contractor on a flat per-video basis. **Deliberately NOT a Cole-style revenue share** — distribution gets a rev share, labor/production gets a flat fee. Terms: **$30 per finished video, no minimum commitment, paid within 14 days of an accepted deliverable.** Starter rate; intent to raise as revenue grows, handled via the agreement's written-amendment clause (not hardcoded).
- **Independent Contractor Agreement SIGNED (June 20), stored in OneDrive:** Company owns work product; contractor warrants rights to footage he provides; 1099 if $600+/yr; Colorado law; 7-day termination. (Isaiah, unlike Cole, has no W-9 item flagged this session; collect one before crossing $600 to be safe.)
- Isaiah declines TikTok on his phone (privacy); confirmed fine with Jackson reposting his Reels to TikTok. His footage is his own (shot as a private individual, unpaid) and his to license. **Watch third-party athlete likenesses on any non-Cole footage.**

**Owned channels (built in parallel, zero or low cost):**
- **Jackson's Strava (~200 distance-runner followers), adopted as a zero-cost trust channel:** fueling notes in run descriptions 1 to 2x/week, one overt launch-day post, bio sharpened. An actual collegiate distance runner is the most credible possible source. The activity-append growth loop ("Fueled with TrueCalorie" auto-appended to activities) is PARKED pending Strava API terms review; the read integration is mission-critical and must not be jeopardized.
- **Own TikTok (handle @truecalorie SECURED June 17 — was the one missing handle; X and IG were already held):** warm-up founder-story posts pre-launch with NO download CTA (the reveal gate stays intact). **Warm-up content greenlit and started June 17, TikTok-first.** Rule reaffirmed: warm-up content slips before the pitch call ever does.
  - **First warm-up video:** voiceover over race + food footage. Angle = "every calorie app is built to make you eat less, I'm a runner" (the RED-S / eat-enough stance). Mileage line: "this summer I'm chasing 90-mile weeks" (honest present-tense, deliberately not inflated to a flat 90). Script + shot map done; VO sent; **Isaiah is editing.**
  - **Backstory carousel (Instagram), drafted:** 13-years-running founder origin, "built the tracker I needed." The AI-built detail is intentionally OMITTED (the hero is the runner, not the tool; never deny it if asked). Slide overlays + caption written. Decision: post the video and the carousel on DIFFERENT days, not together.
  - **[LIVE June 20] First IG Reel posted (founder backstory, no download CTA, reveal gate intact): ~800 views, account at ~33 followers by session end.** First real engagement data. Two reads: (1) **the hook is the #1 retention lever** — drop-off happens in the first 2-3 seconds, so the opening frames are where to spend effort; (2) the demographic skews the target 18-24 band, confirming content is reaching the right niche. Warm-up content is performing as warm-up: building the channel pre-launch without burning the gate.
- **Social positioning unified across all three accounts (June 17):** hero line **"Nutrition for runners, built by one."** Leads with product/voice, founder credibility baked into the hero line, "Eating is training" as the kicker. Audience framing deliberately narrowed from "athletes" to **"runners" on social only** (the app still serves both; marketing leads runner-first; the "built by one" line only works with "runners").
- **Voice-logging demo clip (June 17):** capture via SCREEN RECORDING with mic audio on. One asset, double duty: a muted + on-screen-text version for the landing page (the highest-converting missing landing element, see below), and a sound-on version for TikTok.
- **Email capture on the landing page:** Resend is configured and building no list; every non-signup visitor is currently lost forever (tracked as P2 #16). One planned send: the launch announcement.

**Momentum measurement (thresholds written down pre-launch).** App Store attribution is dark, so metrics are channel-agnostic only, read from PostHog: signups/day, activation rate, trial-to-paid vs the ~5% line (Section 7). Do not pretend to know which channel drove an install.

**Product/landing assets that move conversion (carried, still open):**
- Landing page highest-converting missing element: a 10 to 15 second autoplaying loop of voice logging actually parsing a spoken meal, above the fold. Film once on a phone; doubles as the best TikTok clip.
- Post-onboarding voice prompt: end onboarding with "Log your first meal right now. Just say it." Magic moment by design in minute two of account life, not by accident.
- **[DONE June 20] Founder-customer call HAPPENED.** The fifteen-minute "why they bought / what almost stopped them" conversation is complete. Closes this open item.
- Headline note: "Eating is training." is brand-led; the documented decision is to lead with product quality (voice). Resolution: keep the tagline as kicker, test a voice-led headline once there is traffic to test with. Not a pre-launch priority.

**New open items (June 12):**
- Post-pilot account treatment (do comp accounts convert, expire, or get grandfathered) + the Nutritionix MAU budget those comps consume: decide by pilot week 3.
- "How did you hear about us" onboarding question: post-launch fast-follow (the only first-party attribution signal available given dark App Store data).

**Parked until stores are live:** Stats weight history, water achievement notifications, SEO/prerendered marketing pages (post-launch compounding asset: "calorie calculator for runners," "MacroFactor alternative for athletes"). All three social handles (@truecalorie on TikTok, X, and Instagram) are now SECURED as of June 17; active posting beyond pre-launch warm-up stays gated on the store link.

**Standing rules:** no paid acquisition until organic conversion is proven; no social features until 500+ DAU.

---

## 7. Business model and economics

- Gross margin on subscribers roughly 70%+; Nutritionix cost ~$2.50/MAU/month at the 200 MAU tier ($5,988/yr). Ladder has step functions: $5,988 at 200 MAU, $11,988 at 1,000, $24,000 at 3,000. Costs jump in cliffs while revenue climbs in stairs; plan cash around thresholds. Every active Pro user is by definition an MAU (3+ calls/30 days). **Caveat named June 17: these MAU figures assume a paid Nutritionix plan that was never actually purchased (same quiet-assumption shape as the individual-vs-org account gap). The app is still on the free/demo tier.**
- **Nutritionix plan status and decision (June 17): do NOT buy pre-revenue.** Currently on the FREE/DEMO tier (3,000-call allowance, 23 used). OPEN: confirm whether 3,000 is monthly or a one-time trial cap, and whether the demo terms permit commercial/production use at all. The paid floor was confirmed with the rep: standard $12,000 / 24 months, lowest offered $6,000 / 12 months, and NO tier below it — so there is no cheap legitimate on-ramp. The rep highly discourages demo-tier production use (nothing written prohibits it). DECISION: do not run production on the demo key (relationship + mid-launch cutoff risk outweigh the savings; "nothing written" is no protection given discretionary-termination clauses), and do not buy the $6k plan until EITHER paying revenue comfortably covers it OR monthly usage crosses ~70-80% of the demo cap, whichever first. Monitor usage via the api_rate_limits table (already logs every voice-log + restaurant-search call per user/day). Until then, launch with restaurant search shelved (Section 5 item 4b).
- Founders economics: $79.99 once vs ~$30/yr API cost if active; breakeven ~2.7 years; cap is the only thing making it safe.
- External payments legal basis: post-April 2025 Epic v. Apple ruling, US App Store apps may link out to external payment (Stripe) currently at 0%, presented via system browser; the Epic v. Google injunction (upheld on appeal 2025) opens the same door on US Android. US-only distribution keeps both inside the safe zone. Revisit before any international expansion.
- Trial: no-card maximizes activation data at current scale; conversion now measurable via PostHog; threshold for redesign ~5% trial-to-paid after the pilot.
- Not subject to HIPAA (not a covered entity). Sales tax economic nexus far away; Stripe Tax when justified.
- **Money/ops plan, sharpened June 20 (extends the Section 5 item 7b CPA track; near-term first action is a CPA consult BEFORE revenue):**
  - From the first sale: track EVERY transaction (the new TrueCalorie-Expenses.xlsx, Section 3), and **set aside ~25-30% of profit for taxes (PLACEHOLDER — the CPA confirms the exact rate).**
  - Single-member LLC = **owner's draw, taxes first then draw**; pass-through to personal Schedule C. **SD has no state income tax** (NOTE / TO RECONCILE: the LLC is registered in Colorado and Isaiah's agreement is Colorado-law, while the personal pass-through follows Jackson's state of residence; confirm the CO-registration vs SD-residence split with the CPA — recorded as stated, not yet reconciled in this doc).
  - **Reimbursing personally-fronted business costs is NOT income** (so the expense tracker matters: it substantiates the reimbursement).
  - **W-9 before paying ANY contractor** (Cole's is the outstanding one, Section 3 / Section 6); 1099-NEC if $600+/yr.
  - **Lawyer (Terms/Privacy) timing:** engage when revenue is worth protecting OR before a Mines deal, whichever first. The BINDING reason is disordered-eating / RED-S liability (Section 4 P2 #19), not doc accuracy. Bundle GL + tech E&O insurance into that CPA/lawyer conversation.
  - Separate business bank account already in place (Bluevine, Section 3), which preserves the LLC liability shield as long as funds are never commingled.

---

## 8. Strategic assessment snapshot (June 10, graded vs solo bootstrapped pre-launch founders)

- **Code: B+.** Right architecture, emerging abstraction discipline (analytics.js, openExternal.js), CLAUDE.md institutional memory. Deficits: zero tests (today's two bugs are the recurring cost), no error monitoring, merges straight to prod (preview deployments exist and are unused).
- **UI/design: A-.** Distinctive, coherent, non-template. Voice review UX is genuinely good. Remaining: emoji icons, small type, post-onboarding aha moment unbuilt.
- **Marketing: C+.** Judgment good (TikTok gate, no paid ads, niche focus); execution is potential energy. One customer, one video, pilot unpitched, zero owned channels, the eat-enough positioning unspoken in copy.
- **Scalability: B.** Stack fine to tens of thousands of users. Real constraints: Nutritionix cost cliffs and Jackson-hours (support/ops do not batch the way engineering does).
- **Business: B.** Pricing architecture now sound; excellent plumbing attached to an unvalidated hypothesis. The Mines pilot is the cheapest experiment on the only question that matters.
- **Security: B.** RLS, verifyUser, webhook signatures, key hygiene all solid. Findings: client-side-only Pro gate on the cost-bearing endpoints (P0), no rate limiting, personal-account 2FA unaudited.
- **Legality: B-.** Privacy policy outdated, Gmail contact; otherwise clean (COPPA language present, deletion over-delivers on the 30-day promise).

**Security review update (June 17, posture re-checked against the actual code).** The three June-10 Security findings above are now closed: server-side Pro gate shipped (74adc61), per-user rate caps added (api_rate_limits), and 2FA is on all six core accounts. Posture confirmed solid for this scale: RLS audited clean (database-enforced, a second wall behind the app), verifyUser server-side on all user endpoints, Stripe webhook constructEvent signature check, secrets gitignored, account deletion live. The reinforced top structural gap is the absence of automated tests over the trust boundaries (P1 #2). Two low-severity hardening items were surfaced and right-sized, NOT urgent (Section 4 P2 #18): Strava OAuth `state` is a bare user ID rather than a signed nonce; the rate-limit counter is non-atomic.

**Supabase Security Advisor pass COMPLETE (June 20).** Revoked vestigial EXECUTE grants on `handle_new_user` and `link_founder_on_signup`; enabled Auth leaked-password protection. Now at 0 errors and 2 intentional warnings, both on the public `founder_count()` RPC (SECURITY DEFINER + public grant kept by design; INVOKER breaks the pre-login spots-remaining display). See Section 3.

**Central risk statement:** a month ago the existential risk was "the app doesn't work on iOS." That is solved. Today the existential risk is "nobody finds out it exists, and no one has confirmed they want it." The build:sell ratio must invert over the next 30 days.

**Behavioral principle (self-imposed):** engineering tasks have clear completion states and no rejection risk; selling has neither, so the punch list refills itself forever while market contact slides. Rule: pair every build session with one market-contact action (a pitch sent, a user conversation, a piece of owned content).

---

## 9. Key learnings and principles (cumulative)

New from June 20:
- **Separate deals are separate tracks; never route multiple relationships through one conversation.** A message that is HARD TO PHRASE is usually a tangled STRUCTURE, not a wording problem — split the jobs and the wording resolves itself. (The Wes message bundled "do you actually like it" with Reed's "you'd be very interested" and a structure pitch, and was unsendable for that reason.)
- **When you need an honest read, ask open and go quiet; do not hand someone the answer first.** Repeating Reed's "you'd be very interested" to Wes poisons the read. Pair this with posture: lead as an EQUAL offering something, not a supplicant grateful for the chance — deferential framing gives away position, and it recurs for every deal and the Mines pitch.
- **Read the situation TYPE before picking posture.** Negotiating with an UNVERIFIED party (Wes) and relating to an ESTABLISHED free advocate (Sam) are opposite jobs. With a genuine fan the risk is OVER-managing and deflating enthusiasm, so the move is relationship + honest feedback + launch coordination, not a pitch.
- **Using your own connection is not "leapfrogging" an intermediary.** That label only applies to cutting someone out of an intro THEY control. An independent line to the same person (the former Mines teammate who knows Wes) is fair game.
- **Don't overread low-commitment signals, and don't let "hold off" become "let it evaporate."** A follow from the ~30K Olympian is niche-validation, not interest. "Hold off" needs a written TRIGGER (a concrete post-launch reason) or it silently dies.
- **Recurring avoidance to keep naming: excitement about an opportunity routes AROUND the hard question under it.** Wanting it to be real (does Wes actually like the app; is the RED-S angle safe) turns into ASSUMING it is real. Name the unanswered question explicitly every time.
- **Tie even small giveaways (merch) to actual delivery, not vague promises.**
- **Match fixed-infrastructure commitments to validated demand, and the same logic applies to outreach posture** (extends the June 17 Nutritionix learning into partnerships): don't pre-pay — in dollars OR in deference — for demand or interest you haven't confirmed.

New from June 17:
- **Individual-vs-organization developer enrollment is load-bearing on BOTH app stores.** Chosen once at signup without ever being framed as a decision, it now surfaces as two unrelated-looking annoyances with a single root cause: Jackson's personal legal name on the iOS listing (individual Apple enrollment) and the 12-tester closed-test wall on Android (personal Play account post-Nov-2023). Converting both to LLC organization accounts fixes both at once. Generalizes: a quiet signup-time default can become two expensive-looking problems later; trace co-occurring annoyances back to a shared root before treating them separately.
- **Match contractor compensation to contribution TYPE, not by copying a prior deal.** Distribution gets a revenue share (Cole); labor/production gets a flat fee (Isaiah, $30/video). Don't copy one deal structure onto a different kind of contribution. You can always deepen a simple deal (written-amendment clause); you cannot easily un-give a revenue claim.
- **Commercial outreach to a school-affiliated person goes from the company domain, never the school email** — especially when an NCAA/NIL compliance review is in play. Keeps the commercial/school boundary clean.
- **Native app = bundled UI (frozen per build) + remote backend (instant). This is the whole App Store mental model.** webDir is "dist" with no server.url, so the UI ships frozen in the binary while /api, Supabase, and Vercel env are remote. Consequence: move as much behavior as possible to the server, and flag-gate anything you might want to toggle, so you control it from your server instead of Apple's review queue. UI changes cost a resubmit; backend changes do not.
- **Code review is a snapshot; automated tests are the durable safety net.** The reassurance sought from repeated manual security/code reviews is better delivered by a test suite that re-checks the trust boundaries on every change. Stop re-reviewing for confidence; write the tests.
- **Match fixed infrastructure costs to validated demand, not hoped-for demand.** A $6k/yr Nutritionix commitment before a single paying customer is the wrong sequence. Route around the dependency (voice on Haiku, restaurant search shelved) and let revenue justify the spend. Generalizes to any fixed-cost vendor commitment.

New from June 16:
- **A leaked credential is neutralized by REVOKING it, never by waiting it out.** A leaked Supabase session is a short-lived access token (~1 hour) PLUS a long-lived refresh token; the OAuth alert printed the whole session, so "expires in an hour" only covered the access half. The risk lives in the long-lived half. Sign-out or delete-user revokes both; elapsed time mitigates nothing. Generalizes to any credential.
- **App Review queue position is PER-SUBMISSION and does not transfer across builds.** A new build is reviewed fresh from the back of the queue, so days already banked on an old build are sunk cost, not an asset to preserve. Do not hesitate to swap in a fixed build to "save" queue time.
- **Manual release is the safety net for a broken build.** Even if Apple approves it, a manual-release build sits at "Pending Developer Release" and reaches no one without an explicit release click. Swapping in a fixed build is therefore never a race, only a sequencing decision.
- **"TestFlight Internal Only" landmine recurs every session and must be checked every build** (now hit on builds 27-31 and again on build 34). Distribute App must choose "App Store Connect," and the build number must exceed the highest already uploaded.

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

**Infra / financial accounts (updated June 20):**
- **Vercel: moving Hobby -> Pro** (commercial-use compliance; Pro bills overage instead of going offline). Open: set spend/budget alerts (Section 4 P1 #1c).
- **Bluevine business checking: OPEN since LLC formation** (the separate-business-account piece is in place; preserves the LLC shield as long as funds are not commingled). Open: link Stripe -> Bluevine (Section 4 P1 #1d).
- **Bookkeeping: TrueCalorie-Expenses.xlsx** (Subscriptions / Expenses log / Summary sheets). Substantiates expense reimbursements and the CPA's quarterly-estimate math.
- **Contractor agreements (signed, OneDrive):** Isaiah (flat $30/video production) and Cole (distribution rev share). **Outstanding: Cole W-9.**
- **Supabase Security Advisor: 0 errors, 2 intentional warnings** on `founder_count()` (kept SECURITY DEFINER + public grant; see Section 3 / Section 8).

**Calendar items:** Nov 10 2026 Apple secret regen; close Founders at 100 spots or 30 days post-launch; watch Nutritionix MAU count monthly; **collect Cole's W-9 before paying him (June 20 open item)**.
