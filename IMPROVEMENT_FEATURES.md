# GuideSight — Improvement Features & Polish Backlog

Comprehensive list of improvements for the hackathon demo (March 8, 2026) and beyond.

Legend: `[x]` = completed, `[ ]` = not started

---

## TIER 1: MUST-FIX (Blocks Demo) — ALL COMPLETE

- [x] **1.1 Step Tracker Sync** — Handle ALL custom events (`step_complete`, `step_regression`, `error_flagged`)
- [x] **1.2 Agent Connection Timeout** — 60s timeout + retry UI
- [x] **1.3 Error Display in UI** — Toast notifications via `sonner`
- [x] **1.4 Path Traversal Fix** — Regex validation `^[a-z0-9_]+$` on task IDs
- [x] **1.5 Error Boundary** — `SessionErrorBoundary` wraps coaching session

---

## TIER 2: HIGH IMPACT POLISH — ALL COMPLETE

- [x] **2.1 Task Completion Confetti** — `canvas-confetti` on task complete
- [x] **2.2 Step Completion Animation** — Scale-in animation, smoother progress bar
- [x] **2.3 AI Speaking Waveform** — Web Audio API `AudioWaveform` component
- [x] **2.4 Connection Status Indicator** — Based on `remoteParticipants`
- [x] **2.5 Session Timer** — `useSessionTimer` hook with mm:ss display
- [x] **2.6 Toast Notifications** — `sonner` for step complete, errors, regressions
- [x] **2.7 Live Captions** — Custom captions via `agent_caption` custom events
- [x] **2.8 Video Feed Overlays** — Step badge, instruction bar, border glow (success/error)
- [x] **2.9 Skeleton Loading** — Pulsing skeleton cards in TaskPicker

---

## TIER 3: GEMINI LIVE API — MOSTLY COMPLETE

- [ ] **3.1 Session Resumption** — GoAway handling + resumption tokens (complex, deferred)
- [x] **3.2 Affective Dialog** — `enable_affective_dialog=True`
- [ ] **3.3 NON_BLOCKING Function Calls** — `WHEN_IDLE` / `INTERRUPT` scheduling
- [x] **3.4 Voice Selection** — Puck voice via `SpeechConfigDict`
- [x] **3.5 VAD Tuning** — `START_SENSITIVITY_HIGH`, `END_SENSITIVITY_LOW`, 1000ms silence
- [x] **3.6 Audio Transcription** — Transcript events forwarded to Claude + frontend
- [ ] **3.7 Migrate to Stable Model** — Check Vision Agents model config
- [x] **3.8 Language Config** — `language_code="en-US"`

---

## TIER 4: STREAM VIDEO SDK — MOSTLY COMPLETE

- [ ] **4.1 Built-in Closed Captions** — Not available in SDK; used custom captions instead
- [ ] **4.2 Call Recording** — Not needed for demo
- [x] **4.3 Camera Preview** — Native `getUserMedia` preview on TaskDetail
- [x] **4.4 CallStats Debug Panel** — Toggle with Shift+D
- [ ] **4.5 Noise Cancellation** — Krisp integration (deferred)
- [x] **4.6 Connection Quality** — Via `remoteParticipants` presence
- [ ] **4.7 Device Settings** — Camera/mic selector (deferred)
- [ ] **4.8 Reactions** — Agent sends emoji (deferred)

---

## TIER 5: FRONTEND PACKAGES — COMPLETE

- [x] **Confetti** — `canvas-confetti` installed
- [x] **Toast** — `sonner` installed
- [x] **Keyboard shortcuts** — `react-hotkeys-hook` installed (M=mute, Shift+D=stats, Shift+?=help, Esc=close)
- [ ] Sound effects — `use-sound` (deferred)
- [ ] Progress bar — `@radix-ui/react-progress` (deferred)
- [ ] Bottom sheet — `vaul` (deferred)
- [ ] Lottie animations — `lottie-react` (deferred)

---

## TIER 6: BUGS & CODE QUALITY — MOSTLY COMPLETE

- [ ] **6.1 Memory Leak** — AgentAudio intervals (minor, acceptable for demo)
- [x] **6.2 Race Condition** — Exponential backoff, 25 iterations for call ID polling
- [x] **6.3 Failed Task Fetch** — Error state + "Retry" button in TaskPicker
- [x] **6.4 TaskPicker Crash** — Null coalescing on difficulty colors
- [x] **6.5 CORS Restricted** — `origins=["http://localhost:5173", "http://localhost:4173"]`
- [ ] **6.6 Rate Limiting** — Flask-Limiter (deferred)
- [ ] **6.7 Upload Timeout** — Gemini file polling timeout (deferred)
- [ ] **6.8 Hardcoded API Key** — Move to `.env.local` (deferred)
- [ ] **6.9 Unused Dependency** — `@stream-io/node-sdk` in client (deferred)
- [x] **6.10 TypeScript Types** — Added `during_action_cues` to `TaskStep`
- [x] **6.11 Call Cleanup** — `call.leave()` on unmount
- [x] **6.12 CSS Contrast** — `--text-secondary` bumped to `#a0a0b8` for WCAG AA

---

## TIER 7: NICE-TO-HAVE — PARTIALLY COMPLETE

- [x] **7.1 Mobile Responsive** — Responsive header, stacked layout with `flex-col md:flex-row`
- [ ] **7.2 Camera/Mic Pre-Check** — Friendly permission error
- [ ] **7.3 Task Search/Filter** — Search + difficulty filter
- [ ] **7.4 Drag-to-Reorder Steps** — Admin step reorder
- [x] **7.5 Duplicate Task** — Copy with `_copy` suffix in admin
- [ ] **7.6 JSON Import/Export** — Admin
- [ ] **7.7 Task Preview Mode** — Read-only view
- [x] **7.8 Haptic Feedback** — `navigator.vibrate(200)` on step complete
- [ ] **7.9 Self-View PiP** — Corner camera preview
- [ ] **7.10 Input Validation** — Admin form validation
- [x] **7.11 Coaching State API** — `GET/POST /coaching-state` backup sync endpoint
- [ ] **7.12 First-Time Overlay** — Guided tooltip tour
- [ ] **7.13 Transcript Panel** — Scrolling transcript display
- [ ] **7.14 Dark/Light Toggle** — Theme switcher

---

## TIER 8: CV & AI — MOSTLY COMPLETE

- [ ] **8.1 Fold Line Detection** — Canny edges within paper region
- [x] **8.2 MediaPipe Hand Tracking** — Standalone `HandTracker` class with 21-landmark skeleton, handedness, pinch detection. Extracted as reusable module (`hand_tracker.py`)
- [x] **8.3 Claude Vision Timeout** — `asyncio.wait_for(..., timeout=15.0)`
- [ ] **8.4 Token Budget Estimation** — Trim oldest observations
- [ ] **8.5 Moondream Local VLM** — Zero-shot detection on CPU

---

## TIER 9: GEMINI LIVE AGENT CHALLENGE — NOT STARTED

- [ ] Deploy to Google Cloud Run
- [ ] Architecture diagram
- [ ] 4-min demo video
- [ ] Detailed description writeup

---

## ADDITIONAL FEATURES (Built Beyond Original Backlog)

- [x] **CV Tools Catalog** — 12 CV tool profiles with SVG icons, colors, status badges (`cvTools.ts`, `CvToolBadge.tsx`)
- [x] **CV Tool Picker** — Multi-select grid in admin for assigning tools to tasks
- [x] **CV Tool Badges** — Displayed on task cards (TaskPicker), task detail (TaskDetail), and admin list
- [x] **Task Generation with CV Tools** — Gemini generates `cv_tools` array alongside tasks
- [x] **Analytics Dashboard** — Full company analytics at `#analytics` with 5 tabs:
  - Overview: Hero KPIs, weekly trends, error heatmap, step duration box plots, actionable insights
  - Error Analysis: Pareto chart, full error table, CV tool performance metrics
  - Workers: Performance table, learning curves, competency matrix, coaching dependency scores
  - Voice Insights: Questions/session, AI corrections, barge-in rate, question→FPY correlation
  - Session Log: Full session history with status, FPY, error counts
- [x] **Landing Page 3-Panel** — Company Portal + Analytics + Worker App
- [x] **Task Wizard with Files + Voice** — Multimodal task generation (PDF, images, video, dictation)
- [x] **Task Edit Chat** — AI-powered inline chat for editing tasks with file attachments
- [x] **Agent Transcript Forwarding** — Agent speech → frontend captions via custom events
- [x] **Coaching State Sync** — Dual sync: custom events (primary) + HTTP polling (backup)

---

## KNOWN BUGS (Remaining)

| Bug | Severity | Status |
|-----|----------|--------|
| AgentAudio interval accumulation | MEDIUM | Open — acceptable for demo |
| API key hardcoded in client | HIGH | Open — needs `.env.local` |
| `@stream-io/node-sdk` unused in client deps | LOW | Open |
| Gemini file upload polling no timeout | MEDIUM | Open |
| Admin allows empty steps | LOW | Open |
| No rate limiting on token endpoint | LOW | Open |
