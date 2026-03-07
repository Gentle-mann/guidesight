# GuideSight — UI/UX Comprehensive Upgrade Plan

Based on: hackathon UI research, coaching app UX research, full code review of 12 components.
Goal: Win a YC-hosted hackathon. Judges are YC founders who care about product sense.

---

## PRIORITY 1: CRITICAL UX FIXES (Breaks the demo if not fixed)

### P1.1 "Start Coaching" loading state
- **Problem**: Button triggers up to 50s polling loop with zero visual feedback. Users will click multiple times.
- **Fix**: Disable button, show spinner + connection status messages ("Starting AI Coach...", "Connecting to video...", "Almost ready...")
- **Files**: TaskDetail.tsx, App.tsx

### P1.2 End Session button
- **Problem**: No way to leave coaching session except completing all steps or reloading browser.
- **Fix**: Add "End Session" button in coaching header. Confirm dialog. Clean call leave.
- **Files**: CoachingSession.tsx

### P1.3 Visible Mute/Unmute button
- **Problem**: Mute only via keyboard shortcut (M). Mobile users can't mute.
- **Fix**: Mic toggle button in coaching bottom bar with icon state change.
- **Files**: CoachingSession.tsx

### P1.4 TaskPicker empty state bug
- **Problem**: If server returns 0 tasks, skeleton cards show forever (`!error && tasks.length === 0` = always true).
- **Fix**: Add `loading` state separate from empty. Show "No tasks yet" empty state.
- **Files**: TaskPicker.tsx, App.tsx

### P1.5 Error retry that actually retries
- **Problem**: "Retry" button just clears error, doesn't re-attempt the operation.
- **Fix**: Reset state properly so the flow re-executes.
- **Files**: App.tsx

---

## PRIORITY 2: THE COACHING SESSION (This is the demo screen)

### P2.1 AI Status Orb/Indicator
- **Problem**: No visual indicator of whether AI is listening, thinking, or speaking. Users don't know if the system is alive.
- **Fix**: Animated orb/waveform in the coaching UI that reacts to AI audio state:
  - Idle: slow breathing pulse
  - Speaking: waveform bars synced to audio
  - Listening: subtle pulse
- **Pattern**: ChatGPT blue orb, Gemini Live indicator
- **Files**: CoachingSession.tsx (new component)

### P2.2 Bottom control bar
- **Problem**: Controls are scattered. No clear control area.
- **Fix**: Unified bottom bar with: AI waveform (center), Mute toggle (left), End Session (right), Timer
- **Pattern**: Zoom/Riverside bottom bar
- **Files**: CoachingSession.tsx

### P2.3 StepTracker redesign
- **Problem**: Current step tracker is minimal — no labels, truncated cues, no auto-scroll, future steps too dim.
- **Fix**: Vertical stepper with:
  - Step number in circle + short label
  - Current step expanded to show full instruction
  - Completed steps: green checkmark + collapsed
  - Auto-scroll to current step
  - Completion animation (checkmark slide-in)
- **Pattern**: Carbon Design stepper, Peloton progress
- **Files**: StepTracker.tsx

### P2.4 Video overlay cleanup
- **Problem**: 4 overlays compete on video (LIVE badge, AI Coach badge, caption, instruction). Overlap on mobile.
- **Fix**: Consolidate to:
  - Top-left: Step badge ("Step 3/6") — small, always visible
  - Top-right: LIVE dot + timer
  - Bottom: Single caption/instruction bar (merged, not two separate overlays)
- **Files**: CoachingSession.tsx

### P2.5 Task completion screen polish
- **Problem**: Current completion overlay is functional but basic.
- **Fix**: Add: comparison to estimated time, step count, errors caught, "Great job" with confetti, smooth transition (not just an overlay snap)
- **Files**: CoachingSession.tsx

---

## PRIORITY 3: PAGE TRANSITIONS & ENTRANCE ANIMATIONS

### P3.1 Install motion (Framer Motion)
- **What**: The standard React animation library. ~15KB gzip. Used by Linear, Vercel, Stripe.
- **Why**: Every view change currently snaps. Cards pop in. Modals appear. Nothing animates.

### P3.2 Page view transitions
- TaskPicker → TaskDetail → CoachingSession: fade + slide transitions
- Component mount: fade-in + translateY(8px → 0) over 200-300ms

### P3.3 Task card entrance animations
- Staggered fade-in for task cards (50ms delay between each)
- Hover: subtle scale(1.02) + shadow increase

### P3.4 StepTracker animations
- Step completion: checkmark slides in from left, green pulse
- Step transition: smooth highlight move from completed to next

---

## PRIORITY 4: DESIGN SYSTEM CONSISTENCY

### P4.1 Typography scale
- Standardize: page titles = `text-3xl` everywhere, section headers = `text-lg`, body = `text-sm`, metadata = `text-xs`
- Landing page hero can stay `text-6xl` as the only exception

### P4.2 Border consistency
- Add `--border` CSS variable: `rgba(255, 255, 255, 0.08)`
- Replace all `border-white/5`, `border-white/10`, `border-[var(--bg-card)]` with `border-[var(--border)]`

### P4.3 Border radius consistency
- Cards: `rounded-2xl` everywhere
- Inner elements (inputs, buttons, badges): `rounded-lg`
- Pills/badges: `rounded-full`

### P4.4 Button hover color
- Replace hardcoded `#5b54e6` with CSS variable `--accent-hover`
- Add `--accent-hover` to index.css

### P4.5 Spacing rhythm
- Standardize card padding: `p-5` for all cards
- Section spacing: `space-y-6` between sections
- Inner spacing: `space-y-3` within cards

### P4.6 Focus-visible styles
- Add global `focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-primary)]`
- Apply to all interactive elements

---

## PRIORITY 5: POLISH DETAILS

### P5.1 "Start Coaching" button animation
- Loading spinner that becomes a checkmark on success
- Connection status text updates during polling

### P5.2 Back button hover fix
- TaskDetail "Back" button hover goes darker (backwards). Fix: hover should lighten.

### P5.3 Audio waveform DPI fix
- Canvas is 30x20px, blurry on retina. Fix: multiply by devicePixelRatio.

### P5.4 Delete confirmation
- Replace `window.confirm()` with styled modal matching dark theme.

### P5.5 Select dropdown styling
- Native selects render light-mode options. Add dark styling or use custom dropdown.

### P5.6 Reduced motion support
- Wrap animations in `prefers-reduced-motion` media query.

### P5.7 Inter font import
- Add Google Fonts import for Inter in index.html or CSS.

---

## IMPLEMENTATION ORDER (optimized for hackathon impact)

Phase 1 — Critical fixes (must do):
1. P1.1 Start Coaching loading state
2. P1.2 End Session button
3. P1.3 Mute button
4. P1.4 Empty state fix
5. P1.5 Retry fix

Phase 2 — Coaching session (the money shot):
6. P2.2 Bottom control bar
7. P2.1 AI status indicator
8. P2.3 StepTracker redesign
9. P2.4 Video overlay cleanup
10. P2.5 Completion screen polish

Phase 3 — Transitions & animations:
11. P3.1 Install motion
12. P3.2 Page transitions
13. P3.3 Card entrance animations
14. P3.4 StepTracker animations

Phase 4 — Design system:
15. P4.1-P4.6 All design system fixes (batch)

Phase 5 — Polish:
16. P5.1-P5.7 All polish items (batch)
