# TrueCalorie Context Document
Last updated: June 11, 2026 (repo at b55079b). This file is the single canonical copy of project state. Version history lives in git: `git log -- CONTEXT.md`. This file is updated only via the /wrap-session command; do not edit it ad hoc.

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

## 3. Current state (end of day, June 11, 2026)

### Shipped to production June 11, 2026

| Change | Hash | Notes |
|---|---|---|
| Server-side Pro gate + daily cap on Nutritionix endpoints | 74adc61 | voice-log.js and restaurant-search.js now enforce is_pro server-side (403 for non-Pro); per-user daily caps via the new api_rate_limits table (voice-log 25/day, restaurant-search 75/day). Closes P0 #1. Details below. |
| Privacy policy + Terms updated | 43017ad, 4ad37ad | Privacy: PostHog and Apple sign-in added to service providers. Privacy + Terms contact email switched from personal Gmail to support@truecalorie.net (all instances: prose, mailto href, link text). "Last updated" bumped to June 10. Closes P0 #2 except support@ inbox routing. |

**api_rate_limits (new Supabase table, migration run manually June 11 before deploy):** PRIMARY KEY (user_id, date, endpoint), call_count integer, RLS enabled with a service-role-only ALL policy (USING true / WITH CHECK true). Both endpoints derive isPro from user_settings (deny on lookup error), then SELECT-then-UPDATE/INSERT the counter (Supabase upsert cannot atomically increment). UTC reset window (server-deterministic; an abuse cap, not user-facing day grouping, so the local-date helper deliberately does not apply). Rate-limit DB ops are fail-open: any error logs and continues, so a DB hiccup never blocks a paying user. The is_pro 403 gate is separate and hard-fails. voice-log routing unchanged (trial -> Haiku, paying Pro -> Nutritionix); isTrialing now = isPro && pro_source === 'trial'. Grep confirmed these two files are the only direct callers of trackapi.nutritionix.com; the client service routes through /api/restaurant-search.

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

- **June 9 native session: all four iOS TestFlight bugs fixed and merged.** (1) Input zoom: all inputs at 16px+ so iOS WKWebView stops auto-zooming on focus. (2) Notch/safe area: viewport-fit=cover plus env(safe-area-inset-top) padding across headers. (3) Voice on iOS: native speech plugin removed (Capacitor 8 SPM incompatibility); webkitSpeechRecognition in WKWebView (iOS 16.4+) with the native API-URL prefix pattern. (4) Google OAuth return: truecalorie:// custom scheme, single appUrlOpen listener in App.jsx, exchangeCodeForSession. These fixes are merged but NOT yet verified on a physical device; that verification is step 3 of the roadmap.
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

1. **RESOLVED June 11 (74adc61): server-side Pro gate on Nutritionix endpoints.** Both voice-log.js and restaurant-search.js now enforce is_pro server-side (403 for non-Pro, deny-on-uncertainty) plus per-user daily caps (25 voice / 75 restaurant) via the new api_rate_limits table; rate-limit ops fail open. Original gap: voice-log checked only trial status, restaurant-search had no Pro check, and the "free users generate zero Nutritionix cost" invariant was enforced only by hiding UI buttons; any authenticated token could call the endpoints directly and incur cost.
2. **RESOLVED June 11 (43017ad, 4ad37ad): privacy policy + Terms updated.** PostHog and Apple sign-in added to the privacy policy service-provider list; contact email switched from personal Gmail to support@truecalorie.net in both Privacy.jsx and Terms.jsx; "Last updated" bumped to June 10. **Remaining sub-item (still P0 before App Store submission):** route support@truecalorie.net to a monitored inbox. Resend/Namecheap is configured but the address must actually deliver before it goes in front of reviewers. Note: the new service-provider entries use em-dash separators to match the existing list, which technically conflicts with the no-em-dash copy rule; the whole list predates the rule and was left consistent rather than rewritten.

### P1, soon after launch

3. **No error monitoring.** PostHog shows what users do; nothing reports when code breaks. A failing webhook is silent until a customer complains. Sentry free tier, one session.
4. **No automated tests.** Today's two stale-caller bugs are the recurring cost. Mitigation that fits the workflow: a Claude Code-written smoke-test suite for API endpoints (auth rejection, checkout returns URL, webhook parses sample event), run before every merge.
5. **Account security audit (IN PROGRESS, started June 11).** GitHub complete: passkey + 2FA, recovery codes stored in the password manager. Scope expanded from 6 to 9 accounts; remaining in priority order: Google (recovery skeleton key, highest priority), Vercel (env vars = all secrets), Stripe, Supabase, Apple, Namecheap (DNS + truecalorie.net email), the password-manager vault itself, and the Anthropic account. Standing rule: prefer passkeys/TOTP, remove SMS fallbacks where allowed. Original rationale stands: one phished credential on a write-access account = production compromised. Highest-ROI security action available.

### P2, cleanup list (do not let these jump the queue)

6. Trial copy inconsistency: Purchases CTA for post-trial users says "Start 7-day free trial, no card charged until trial ends" but the trial was already granted at signup. Watch in PostHog for confusion, then fix copy or flow.
7. Auth.jsx uses hardcoded hex colors (#0a0a0a, #111, #ef4444) instead of design-system CSS variables.
8. App.jsx is a god component (ring, bars, log, all overlays). Rule going forward: new features go in components, not App.jsx. Full refactor is not currently worth the risk.
9. Emoji icons (feature lists, Trends) read cheap vs the otherwise premium system; Tabler icons are already bundled. Cosmetic.
10. Some text at 10 to 11px is below comfortable readability.

---

## 5. Immediate roadmap (ordered, native launch track)

1. **DONE June 11: P0 items 1 and 2** (server-side Pro gate + rate cap 74adc61; privacy policy + Terms update 43017ad/4ad37ad). Web-only, deployed via Vercel. Only the support@ inbox routing remains (see P0 #2).
2. **MacinCloud session** (batch everything Xcode-related):
   - Master paste block now needs a fourth export: `export VITE_POSTHOG_KEY="phc_..."` alongside VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, CAPACITOR_BUILD=true. Missing it ships native with analytics silently disabled.
   - npm install pulls posthog-js and @capacitor/browser; cap sync registers the Browser plugin automatically.
   - Optional but recommended patch-plist.sh addition: `/usr/libexec/PlistBuddy -c "Add :ITSAppUsesNonExemptEncryption bool false" "$PLIST" 2>/dev/null || true` (skips the export compliance question every build).
   - In Xcode: uncheck iPad under Deployment Info (iPhone-only = no iPad screenshots, smaller review surface). Recreate App.entitlements manually as usual (no new entitlements needed; Apple sign-in is browser-flow). Increment build number. Archive, upload to TestFlight.
3. **Device verification checklist (physical iPhone, in order):** fresh install; Google sign-in survives force-quit; sign out, Apple sign-in same checks; voice log a real meal and confirm meal_logged {voice} in PostHog Activity; inputs do not zoom, no notch overlap; Pro checkout opens a Safari sheet (not in-app); **the money test:** buy monthly on own card, confirm Pro activates on resume, confirm subscription_activated in PostHog, open Manage billing from the Purchases page specifically (regression test for the portal fix), cancel via portal, refund in Stripe dashboard. One $9.99 round trip validates checkout, webhook, source mapping, resume refresh, and the portal fix. Then delete-account on a throwaway.
4. **App Store submission:**
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

- **Mines athletic department pilot: the highest-leverage move, costs one conversation, send the pitch THIS WEEK in parallel with the build work, not after.** Mechanics: comp accounts for the team (pro_source 'comp' plumbing exists), defined 4-week window, midpoint check-in, two asks at the end: honest testimonial and an App Store review from anyone who genuinely liked it (asking is allowed, incentivizing is not). Pitch angle: the fueling-adequacy / RED-S-aware framing; coaches and athletic trainers care deeply. Summer base-building is good timing.
- **Channel concentration risk, named explicitly:** the friend's TikTok account is the single greatest marketing asset and it is not owned. It is a relationship dependency (interest, graduation, bans, future payment expectations). Mitigation: build owned channels in parallel. Jackson's own account documenting the founder journey (an actual collegiate distance runner building the tool for his own training is the most credible possible source), and email capture on the landing page (Resend is configured and building no list; every non-signup visitor is currently lost forever).
- **Landing page, highest-converting missing element:** a 10 to 15 second autoplaying loop of voice logging actually parsing a spoken meal, above the fold. Film once on a phone; doubles as the best TikTok clip.
- **Post-onboarding voice prompt:** end onboarding with "Log your first meal right now. Just say it." Magic moment by design in minute two of account life, not by accident whenever.
- **Talk to the one Founder customer.** Fifteen minutes on why they bought and what almost stopped them is worth more than any further analysis.
- **Headline note:** "Eating is training." is brand-led; the documented positioning decision says lead with product quality (voice). Current resolution: keep the tagline as kicker, test a voice-led headline once there is traffic to test with. Not a pre-launch priority.
- Parked until stores are live: Stats weight history, water achievement notifications, SEO/prerendered marketing pages (post-launch compounding asset: "calorie calculator for runners," "MacroFactor alternative for athletes"), X/Instagram (low-priority background under "truecalorie").
- Standing rules: no paid acquisition until organic conversion is proven; no social features until 500+ DAU.

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

**Key new files since June 8:** src/analytics.js, src/lib/openExternal.js, api/delete-account.js, scripts/gen-apple-secret.mjs.

**Supabase tables (rate limiting):** api_rate_limits, added June 11. PK (user_id, date, endpoint), call_count int, RLS on with a service-role-only ALL policy. Backs the daily caps on /api/voice-log (25/user/day) and /api/restaurant-search (75/user/day); UTC reset window; fail-open on DB error. SQL migrations are still run manually in the Supabase SQL editor before deploy.

**Calendar items:** Nov 10 2026 Apple secret regen; close Founders at 100 spots or 30 days post-launch; watch Nutritionix MAU count monthly.
