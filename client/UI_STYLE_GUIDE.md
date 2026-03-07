# GuideSight UI/UX Style Guide & Change Documentation

Complete documentation of all design decisions, CSS utilities, component patterns, and animations used across the GuideSight frontend.

---

## Table of Contents

1. [Design System Foundation](#1-design-system-foundation)
2. [CSS Utility Classes](#2-css-utility-classes)
3. [Animations & Keyframes](#3-animations--keyframes)
4. [Component-Level Documentation](#4-component-level-documentation)
5. [Interactive Effects](#5-interactive-effects)
6. [Accessibility](#6-accessibility)
7. [Third-Party Libraries](#7-third-party-libraries)

---

## 1. Design System Foundation

### Color Palette (`index.css :root`)

| Variable | Value | Usage |
|----------|-------|-------|
| `--bg-primary` | `#09090b` | Page background (near-black) |
| `--bg-secondary` | `#111113` | Sidebar, secondary surfaces |
| `--bg-card` | `#18181b` | Card backgrounds |
| `--bg-card-hover` | `#1f1f23` | Card hover state |
| `--accent` | `#6c63ff` | Primary brand color (electric indigo) |
| `--accent-hover` | `#5b54e6` | Accent hover state |
| `--accent-glow` | `rgba(108, 99, 255, 0.25)` | Glow/shadow color |
| `--accent-subtle` | `rgba(108, 99, 255, 0.08)` | Very faint accent tint |
| `--success` | `#22c55e` | Green (step complete, positive) |
| `--error` | `#ef4444` | Red (errors, destructive) |
| `--warning` | `#f59e0b` | Amber (warnings, pending) |
| `--text-primary` | `#fafafa` | Main text (near-white) |
| `--text-secondary` | `#71717a` | Subdued text (zinc-500) |
| `--text-tertiary` | `#52525b` | Faintest text (zinc-600) |
| `--border` | `rgba(255, 255, 255, 0.06)` | Default border |
| `--border-hover` | `rgba(255, 255, 255, 0.12)` | Hover border |
| `--gradient-start` | `#6c63ff` | Gradient left (indigo) |
| `--gradient-end` | `#a855f7` | Gradient right (purple) |

### Typography

- **Font**: `'Inter', system-ui, -apple-system, sans-serif` (loaded from Google Fonts: weights 400-800)
- **Monospace**: `'SF Mono', 'Fira Code', 'Cascadia Code', monospace` (terminal, code, kbd)
- **Rendering**: `-webkit-font-smoothing: antialiased`, `-moz-osx-font-smoothing: grayscale`
- **Letter spacing**: `tracking-tight` on headings, `tracking-wider` on uppercase labels
- **Tabular numbers**: `.tabular-nums` class with `font-variant-numeric: tabular-nums` for aligned counters

### Spacing & Layout

- **Max widths**: `max-w-5xl` (task detail), `max-w-6xl` (task picker, landing), `max-w-7xl` (admin)
- **Header height**: `h-16` (64px) across all pages
- **Section padding**: `py-24` to `py-32` on landing, `py-8` to `py-12` on app pages
- **Card padding**: `p-5` to `p-8` depending on density
- **Border radius**: `rounded-2xl` (16px) for cards, `rounded-xl` (12px) for buttons, `rounded-full` for pills/badges

---

## 2. CSS Utility Classes

### `.text-gradient`
Gradient text from indigo to purple using `background-clip: text`.
```css
background: linear-gradient(135deg, var(--gradient-start), var(--gradient-end));
-webkit-background-clip: text;
-webkit-text-fill-color: transparent;
```
**Used on**: "Guide" in GuideSight logo, stat numbers, hero text.

### `.bg-grid`
Subtle dot grid pattern for page backgrounds.
```css
background-image: radial-gradient(circle at 1px 1px, rgba(255,255,255,0.03) 1px, transparent 0);
background-size: 32px 32px;
```
**Used on**: TaskPicker, TaskDetail, AdminDashboard page containers.

### `.bg-mesh`
Radial gradient overlay (3 ellipses: blue-left, purple-right, blue-top) for depth.
```css
background:
  radial-gradient(ellipse 50% 50% at 20% 30%, rgba(108, 99, 255, 0.08) ...),
  radial-gradient(ellipse 40% 40% at 80% 70%, rgba(168, 85, 247, 0.06) ...),
  radial-gradient(ellipse 60% 30% at 50% 0%, rgba(108, 99, 255, 0.04) ...);
```
**Used on**: Landing hero, error screens, loading screens.

### `.glass-card`
Glassmorphism card with blur and semi-transparent background.
```css
background: rgba(24, 24, 27, 0.6);
backdrop-filter: blur(12px);
border: 1px solid var(--border);
border-radius: 16px;
```
Hover state lightens background and border.
**Used on**: Task cards, info panels, KPI tiles, modals.

### `.glow-line`
Horizontal gradient glow line at element top via `::before`.
```css
width: 60%; max-width: 600px; height: 1px;
background: linear-gradient(90deg, transparent, var(--accent), transparent);
opacity: 0.4;
```

### `.btn-primary`
Primary action button with glow shadow.
```css
padding: 12px 28px; background: var(--accent); border-radius: 12px;
box-shadow: 0 0 20px var(--accent-glow);
```
Hover: lifts 1px, intensifies glow. Active: removes lift.

### `.btn-secondary`
Ghost button with border only.
```css
background: transparent; border: 1px solid var(--border); border-radius: 12px;
```
Hover: slight background tint.

### `.nav-link`
Linear-style sliding underline on hover via `::after` pseudo-element.
```css
::after { width: 0; height: 1.5px; background: var(--accent); }
:hover::after { width: 100%; }
transition: all 0.25s cubic-bezier(0.33, 1, 0.68, 1);
```

### `.btn-magnetic`
Spring-eased transform transition for magnetic button effect (JS-driven).
```css
transition: transform 0.2s cubic-bezier(0.33, 1, 0.68, 1), box-shadow 0.2s ease;
```

### `.text-shimmer`
Sweeping light highlight across text.
```css
background: linear-gradient(90deg, white 0-40%, rgba(accent, 0.8) 50%, white 60-100%);
background-size: 200% 100%;
animation: text-shimmer 6s ease-in-out infinite;
animation-delay: 2s;
```

### `.section-glow-divider`
Glowing line separator between landing page sections.
```css
height: 1px; background: var(--border); max-width: 80%;
::after { width: 200px; background: gradient(accent); filter: blur(1px); }
```

### `.terminal-window`, `.terminal-header`, `.terminal-body`
macOS-style terminal mock with traffic light dots.
```css
background: #0c0c0e; font-family: monospace;
.terminal-dot { width: 10px; height: 10px; border-radius: 50%; }
```
Color tokens: `.line-prompt` (green), `.line-comment` (zinc), `.line-accent` (indigo), `.line-string` (purple), `.line-success` (lime).

### `.noise-overlay`
Film grain texture via SVG fractalNoise at 1.5% opacity.
```css
::before { opacity: 0.015; background-image: url("data:image/svg+xml,...feTurbulence..."); }
```

### `.kbd`
Keyboard shortcut badge (monospace, tiny, bordered).
```css
padding: 2px 6px; font-size: 10px; background: rgba(255,255,255,0.04);
border: 1px solid var(--border); border-radius: 4px;
```

### `.breathe-ring`
Pulsing ring animation via `::before` for live indicators.
```css
::before { border: 1.5px solid var(--accent); animation: breathe 2.5s infinite; }
```

### `.scroll-hint`
Bouncing arrow to encourage scrolling (3s delay before starting).
```css
animation: scroll-hint 2s ease-in-out infinite; animation-delay: 3s;
```

### `.footer-glow`
Gradient line at top of footer via `::before`.
```css
::before { left: 10%; right: 10%; height: 1px; background: gradient(accent); opacity: 0.3; }
```

### `.stagger-children`
Cascading entrance animation for child elements (80ms intervals, up to 6 children).
```css
> *:nth-child(1) { animation-delay: 0ms; }
> *:nth-child(2) { animation-delay: 80ms; }
... up to nth-child(6) at 400ms
```

### `.card-tilt` / `.card-tilt-inner`
3D perspective container for mouse-following tilt effect.
```css
perspective: 800px; transform-style: preserve-3d;
.card-tilt-inner { transition: transform 0.3s spring-easing; will-change: transform; }
```

---

## 3. Animations & Keyframes

| Keyframe | Effect | Duration | Usage |
|----------|--------|----------|-------|
| `fade-in` | Fade up 12px | 0.5s ease-out | General entrance |
| `fade-in-slow` | Fade up 20px | 0.7s ease-out | Hero elements |
| `scale-in` | Scale from 0.5 | 0.4s spring | Task complete checkmark, modal pop |
| `float` | Vertical bob 6px | 4s infinite | Decorative elements |
| `pulse-glow` | Box-shadow pulse | 3s infinite | Accent glow on orbs |
| `shimmer` | Background slide | - | Loading shimmers |
| `gradient-shift` | Background position cycle | 6s infinite | Animated gradients |
| `text-shimmer` | Light sweep across text | 6s infinite (2s delay) | Hero heading |
| `breathe` | Scale 1 to 1.8 + fade | 2.5s infinite | Live indicator ring |
| `scroll-hint` | Bounce down 6px | 2s infinite (3s delay) | Scroll arrow |
| `blink-caret` | Opacity toggle | 0.8s step-end | Terminal cursor |

### Spring easing curve
Used throughout for natural-feeling motion:
```
cubic-bezier(0.33, 1, 0.68, 1)
```
Also used: `cubic-bezier(0.34, 1.56, 0.64, 1)` for bouncy scale-in.

---

## 4. Component-Level Documentation

### LandingPage.tsx (~790 lines)

**Custom hooks:**
- `useInView(threshold)` — IntersectionObserver returning `{ ref, isInView }`. Triggers once (no unobserve reset).

**Sub-components:**

| Component | What it does | Key technique |
|-----------|-------------|---------------|
| `Reveal` | Scroll-triggered fade-up wrapper | `useInView` + CSS transition (opacity + translateY) |
| `RotatingText` | Cycles 4 phrases every 3s | `setInterval` + opacity/blur CSS transition |
| `AnimatedNumber` | Counts from 0 to target on scroll | `requestAnimationFrame` + ease-out cubic + `useInView` |
| `GlowCard` | Card with mouse-following glow + 3D tilt | `onMouseMove` sets CSS vars `--glow-x/y`, calculates `rotateX/Y` from cursor position |
| `MagneticButton` | Button that pulls toward cursor | `onMouseMove` translates at 15% of cursor offset from center |
| `StickyCta` | Fixed bottom CTA bar | Appears after 600px scroll via `scroll` event listener |
| `NavBar` | Top nav, transparent -> blurred | `scrollY > 20` toggles backdrop-blur + bg opacity |

**Sections (in order):**
1. `NavBar` — Logo, nav links (`.nav-link`), CTA button
2. `HeroSection` — Shimmer heading, rotating subtext, magnetic CTA buttons, scroll hint chevron, animated gradient border device mock, breathing ring badge
3. `TechLogosSection` — 6 SVG tech icons (Gemini, Stream, React, OpenCV, MediaPipe, Tailwind) with hover lift
4. `StatsSection` — 3 animated counters ($200B, 8M, 10x) with labels
5. `ComparisonSection` — Before/After two-column with red X / green checkmark items
6. `FeaturesSection` — 6 GlowCards in 3-col grid with SVG icons
7. `ArchitectureSection` — 3 pipeline boxes (Camera -> CV Glasses -> AI Brain) with connecting arrows
8. `SocialProofSection` — Animated terminal (line-by-line typing) + JSON code snippet side by side
9. `UseCasesSection` — 4 tab buttons (Manufacturing, Healthcare, etc.) switching content panels
10. `HowItWorksSection` — 3 numbered steps with icons
11. `CtaSection` — Large centered CTA with keyboard shortcut badge (D key)
12. `HackathonBar` — Fixed announcement bar for c0mpiled hackathon
13. `Footer` — 4-column links, gradient top border, GitHub badge

**Key patterns:**
- All sections wrapped in `<Reveal>` for scroll-triggered entrance
- `<GlowDivider />` between major sections
- Noise overlay on hero via `.noise-overlay` class
- Keyboard shortcut: pressing `D` triggers the worker flow

### TaskPicker.tsx

**States handled:** Loading (skeleton cards), Error (retry button), Empty (link to admin), Data (card grid).

**Skeleton loading:**
```tsx
<div className="h-5 bg-white/5 rounded-lg w-2/3 animate-pulse" />
```
Three skeleton cards rendered during `loading=true`.

**Task card anatomy:**
- Glass card with accent border glow on hover
- Title (bold, accent on hover), difficulty badge (colored dot + pill)
- Description (2-line clamp)
- CV tool bar (if available)
- Metadata row: steps | time | items (with SVG icons)
- Footer: "Start training" with animated arrow (`group-hover:translate-x-1`)

**Difficulty badge colors:**
```
beginner:     emerald (bg-emerald-500/10, text-emerald-400, dot bg-emerald-400)
intermediate: amber   (bg-amber-500/10, text-amber-400, dot bg-amber-400)
advanced:     red     (bg-red-500/10, text-red-400, dot bg-red-400)
```

### TaskDetail.tsx

**Layout:** 5-column grid — camera preview (3 cols) + task info sidebar (2 cols).

**CameraPreview component:**
- Requests `getUserMedia({ video: true })`
- Shows spinner while loading, error state if denied
- Mirror transform: `style={{ transform: 'scaleX(-1)' }}`
- Green "Camera ready" badge with pulsing dot when stream active

**Task info sidebar:**
- Difficulty + time + steps metadata row
- Task name (2xl bold) + description
- CV tools section (if available)
- Components list with accent dots
- Full-width Start button (loading state: spinner + status text)
- Steps overview card (numbered list, first sentence only)

**Info tip card:**
- Glass card with accent-subtle icon background
- "Before you start" positioning guidance

### CoachingSession.tsx

**Architecture:**
```
SessionErrorBoundary (class component)
  -> Toaster (sonner)
  -> CoachingSessionInner (hooks-based)
```

**Custom hooks:**
- `useSessionTimer()` — 1s interval counter returning `elapsed` (MM:SS) and `totalSeconds`

**Key features:**
- **AudioWaveform** — DPI-aware canvas (devicePixelRatio), Web Audio API `AnalyserNode`, 5 bars with rounded corners, accent-colored with opacity varying by amplitude
- **Border glow** — `glowType` state ('none'|'success'|'error') with 2s auto-clear. Green inset shadow on step complete, red on error
- **Agent timeout** — 60s timer, shows disconnect overlay if no `guidesight-coach` participant
- **Confetti** — `canvas-confetti` on task completion (3 bursts: center + left + right)
- **Haptic feedback** — `navigator.vibrate(200)` on step complete, pattern `[200,100,200]` on task complete
- **Toast notifications** — `sonner` for step complete, error flagged, step regression events
- **Keyboard shortcuts** — `react-hotkeys-hook`: M (mute), Shift+D (debug stats), Shift+? (shortcuts help), Esc (close overlays)

**Video overlay layers (z-order on camera feed):**
1. Step badge (top-left): `bg-black/60 backdrop-blur-sm rounded-full`
2. LIVE dot + timer (top-right): red pulsing dot + mono timer
3. Caption bar (bottom): agent speech text, auto-clears after 6s
4. Current step instruction (bottom): shown when no caption active
5. Waiting for agent overlay (center): spinner + message
6. Agent timeout overlay (center): error icon + "Keep Waiting" button

**Bottom control bar:**
- Left: Mute toggle (red highlight when muted, icon switches)
- Center: AI Status Orb (pulsing accent dot + ping ring when connected, warning when connecting, error when timeout) + "Listening"/"Connecting..."/"Disconnected" label + AudioWaveform canvas
- Right: End Session button (hover turns red)

**End session dialog:**
- Fixed overlay with `bg-black/70 backdrop-blur-sm`
- Glass card with scale-in animation
- Shows progress (X of Y steps in MM:SS)
- Two buttons: Continue (secondary) + End Session (red)

**Task complete screen:**
- Large green checkmark with scale-in animation
- Stats grid: Time taken (gradient text), Steps done (green), Estimated time
- "Back to Tasks" primary button

**Custom event handling (from agent via Stream):**
```
step_complete  -> advance step, green glow, vibrate, toast (or confetti if final)
step_regression -> go back, toast with arrow icon
error_flagged  -> red glow, error toast
agent_caption  -> show caption text, auto-clear 6s
```

### StepTracker.tsx

**Layout:** Header (progress label + count) + progress bar + scrollable step list + footer.

**Progress bar:**
- 1px height, accent gradient fill (or green at 100%)
- Animated width transition: `transition-all duration-700 ease-out`

**Step states:**
- **Completed**: Green circle with checkmark SVG, 50% opacity, "Completed" label
- **Current**: Accent circle with glow shadow, full opacity, description text shown
- **Upcoming**: Gray circle with number, 30% opacity

**Just-completed animation:** Scale-in bounce (`animate-scale-in`) on the circle for 600ms.

**Auto-scroll:** `scrollIntoView({ behavior: 'smooth', block: 'nearest' })` on current step change.

**Connecting lines:** 1px vertical lines between steps. Green-tinted when completed, very faint when not.

### AdminDashboard.tsx

**Header:** Sticky navbar with breadcrumb (GuideSight / Company Portal), Analytics and Home links.

**Company badge:** Glass card with gradient avatar circle (initials "AC"), company name, task count.

**Task list:** Cards with task metadata, Edit/Duplicate/Delete buttons.

**Edit form:** Two-column layout on desktop (form + inline AI chat), single column on mobile with floating chat bubble.

**Form fields:** Dark input styling (`bg-[var(--bg-secondary)] rounded-lg`), uppercase tracking-wider labels, monospace textarea for components.

### AnalyticsDashboard.tsx

**Header:** Same sticky navbar pattern with breadcrumb (GuideSight / Analytics).

**Period selector:** Native `<select>` with `style={{ colorScheme: 'dark' }}` for dark dropdown.

**KPI tiles:** 6 glass cards with staggered entrance animation, delta badges (green up / red down / amber neutral).

**Tab navigation:** Underline-style tabs with accent bottom bar on active tab.

**Data sections:** Error heatmap, session timeline, worker leaderboard, task completion chart — all with synthetic demo data.

### App.tsx

**Routing:** Hash-based (`#admin`, `#analytics`, no hash = landing).

**State management:** 11 useState hooks for client, call, task, UI states.

**Join flow status messages:** "Starting AI Coach..." -> "Connecting to video..." -> "Almost ready..." -> "Joining session..."

**Call-ID polling:** Up to 25 attempts with exponential backoff (2s base, 1.2x growth, 5s cap).

**Error screen:** Centered glass card with warning icon, error message, "Try Again" button that resets all state.

**Loading screen:** Centered accent spinner with "Initializing..." text.

---

## 5. Interactive Effects

### Mouse-following glow (GlowCard)
```tsx
onMouseMove={(e) => {
  const rect = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty('--glow-x', `${e.clientX - rect.left}px`);
  e.currentTarget.style.setProperty('--glow-y', `${e.clientY - rect.top}px`);
}}
```
CSS: `radial-gradient(300px circle at var(--glow-x) var(--glow-y), accent-subtle, transparent)`

### 3D card tilt (GlowCard)
```tsx
const x = e.clientX - rect.left;
const y = e.clientY - rect.top;
const centerX = rect.width / 2;
const centerY = rect.height / 2;
const rotateX = (y - centerY) / centerY * -4;  // max 4deg
const rotateY = (x - centerX) / centerX * 4;
inner.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
```

### Magnetic button pull (MagneticButton)
```tsx
const offsetX = (e.clientX - rect.left - rect.width / 2) * 0.15;
const offsetY = (e.clientY - rect.top - rect.height / 2) * 0.15;
el.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
```
Resets on mouse leave.

### Navbar scroll state
```tsx
const [scrolled, setScrolled] = useState(false);
useEffect(() => {
  const onScroll = () => setScrolled(window.scrollY > 20);
  window.addEventListener('scroll', onScroll);
  ...
});
```
Toggles: `bg-transparent` -> `bg-[var(--bg-primary)]/80 backdrop-blur-xl border-b`

### Sticky CTA bar
Appears after 600px scroll, slides up from bottom with `translate-y-full` -> `translate-y-0` transition.

### Terminal typing animation
Lines appear one by one with 300ms intervals using `setTimeout` in a `useEffect`.
```tsx
useEffect(() => {
  if (!isInView) return;
  TERMINAL_LINES.forEach((_, i) => {
    setTimeout(() => setVisibleLines(i + 1), i * 300);
  });
}, [isInView]);
```

### Animated number counter
```tsx
const animate = (timestamp) => {
  const progress = Math.min((timestamp - start) / 1500, 1);
  const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
  setValue(Math.floor(eased * target));
  if (progress < 1) requestAnimationFrame(animate);
};
```
Triggered when element enters viewport via `useInView`.

---

## 6. Accessibility

### Reduced motion
All animations disabled via `prefers-reduced-motion: reduce`:
```css
@media (prefers-reduced-motion: reduce) {
  .animate-fade-in, .animate-scale-in, .text-shimmer, ... {
    animation: none !important;
  }
  .stagger-children > * { animation: none !important; opacity: 1 !important; }
  * { transition-duration: 0.01ms !important; }
}
```

### Focus indicators
All interactive elements get a visible focus ring:
```css
button:focus-visible, a:focus-visible, input:focus-visible, ... {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
```

### Text selection
Custom selection color matching brand:
```css
::selection { background: rgba(108, 99, 255, 0.3); color: var(--text-primary); }
```

### Scrollbar
Minimal custom scrollbar (6px, semi-transparent):
```css
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
```

### Scroll behavior
Smooth scrolling with padding for sticky headers:
```css
html { scroll-behavior: smooth; scroll-padding-top: 80px; }
```

---

## 7. Third-Party Libraries

| Library | Version | Usage |
|---------|---------|-------|
| `react` | 19 | UI framework |
| `tailwindcss` | v4 | Utility-first CSS |
| `@stream-io/video-react-sdk` | latest | WebRTC video/audio |
| `sonner` | latest | Toast notifications in coaching session |
| `react-hotkeys-hook` | latest | Keyboard shortcuts (M, Shift+D, Shift+?, Esc) |
| `canvas-confetti` | latest | Task completion celebration |
| `vite` | latest | Build tool |

---

## Design Inspiration Sources

- **Linear** — Nav underline hover, glass cards, minimal dark UI
- **Vercel** — Grid backgrounds, gradient borders, terminal mocks
- **Stripe** — Gradient text, section dividers, comparison tables
- **Raycast** — Keyboard shortcut badges, sticky CTA, noise texture
- **Apple** — Scroll-triggered reveals, spring animations, reduced motion support
