import { useEffect, useRef, useState, useCallback, type ReactNode } from 'react';

interface LandingPageProps {
  onSelectPortal: () => void;
  onSelectWorker: () => void;
}

// --- Scroll-triggered reveal hook ---
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setIsInView(true); },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);
  return { ref, isInView };
}

function Reveal({ children, className = '', delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const { ref, isInView } = useInView();
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

// --- #1: Rotating hero text with clip-path reveal ---
const HERO_PHRASES = [
  'and coaches you live',
  'and catches mistakes',
  'and guides every step',
  'and trains your team',
];

function RotatingText() {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const id = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % HERO_PHRASES.length);
        setVisible(true);
      }, 400);
    }, 3500);
    return () => clearInterval(id);
  }, []);

  return (
    <span
      className={`text-gradient inline-block transition-all duration-400 ${
        visible ? 'opacity-100 translate-y-0 blur-0' : 'opacity-0 translate-y-3 blur-[2px]'
      }`}
      style={{ transitionTimingFunction: 'cubic-bezier(0.33, 1, 0.68, 1)' }}
    >
      {HERO_PHRASES[index]}
    </span>
  );
}

// --- #2: Animated counter with tabular nums ---
function AnimatedNumber({ value, suffix = '' }: { value: string; suffix?: string }) {
  const { ref, isInView } = useInView(0.3);
  const [display, setDisplay] = useState(value);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!isInView || hasAnimated.current) return;
    hasAnimated.current = true;

    const match = value.match(/^([^0-9]*)(\d+)(.*)/);
    if (!match) return;
    const prefix = match[1];
    const num = parseInt(match[2]);
    const rest = match[3];
    const duration = 1500;
    const start = performance.now();

    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(num * eased);
      setDisplay(`${prefix}${current}${rest}`);
      if (progress < 1) requestAnimationFrame(tick);
    };
    setDisplay(`${prefix}0${rest}`);
    requestAnimationFrame(tick);
  }, [isInView, value]);

  return <span ref={ref} className="tabular-nums">{display}{suffix}</span>;
}

// --- #3: Hover glow card with subtle 3D tilt ---
function GlowCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const el = e.currentTarget as HTMLDivElement;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    el.style.setProperty('--glow-x', `${x}px`);
    el.style.setProperty('--glow-y', `${y}px`);
    // 3D tilt: max 2deg rotation
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -2;
    const rotateY = ((x - centerX) / centerX) * 2;
    el.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
  }, []);

  const handleMouseLeave = useCallback((e: React.MouseEvent) => {
    (e.currentTarget as HTMLDivElement).style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg)';
  }, []);

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`glass-card relative overflow-hidden group transition-transform duration-300 ${className}`}
      style={{
        background: 'rgba(24, 24, 27, 0.6)',
        willChange: 'transform',
        transitionTimingFunction: 'cubic-bezier(0.33, 1, 0.68, 1)',
      }}
    >
      {/* Mouse-following glow */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{
          background: 'radial-gradient(400px circle at var(--glow-x, 50%) var(--glow-y, 50%), rgba(108,99,255,0.07), transparent 60%)',
        }}
      />
      {/* Top edge highlight on hover */}
      <div
        className="absolute top-0 left-0 right-0 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(108,99,255,0.4), transparent)',
        }}
      />
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}

// --- #4: Magnetic button component ---
function MagneticButton({ children, onClick, className = '' }: { children: ReactNode; onClick?: () => void; className?: string }) {
  const btnRef = useRef<HTMLButtonElement>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const el = btnRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    el.style.transform = `translate(${x * 0.15}px, ${y * 0.15}px)`;
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (btnRef.current) btnRef.current.style.transform = 'translate(0, 0)';
  }, []);

  return (
    <button
      ref={btnRef}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`btn-magnetic ${className}`}
    >
      {children}
    </button>
  );
}

// --- #5: Sticky CTA ---
function StickyCta({ onClick }: { onClick: () => void }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 600);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-500 ${
      show ? 'translate-y-0 opacity-100' : 'translate-y-16 opacity-0 pointer-events-none'
    }`}>
      <button
        onClick={onClick}
        className="btn-primary !rounded-full !py-3 !px-8 shadow-2xl shadow-black/40 backdrop-blur-sm flex items-center gap-2"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
        </svg>
        Try the Demo
        <span className="kbd ml-1">D</span>
      </button>
    </div>
  );
}

// --- #6: Terminal mock social proof ---
function TerminalBlock() {
  const { ref, isInView } = useInView(0.3);
  const [lines, setLines] = useState(0);
  const allLines = [
    { type: 'comment', text: '# Start the GuideSight coaching agent' },
    { type: 'prompt', text: '$ python agent.py' },
    { type: 'normal', text: '[agent] Polling for task selection...' },
    { type: 'accent', text: '[agent] Task received: paper_airplane' },
    { type: 'normal', text: '[agent] Loading CV processors: OpenCV, MediaPipe' },
    { type: 'normal', text: '[agent] Building system prompt with 6 steps...' },
    { type: 'accent', text: '[agent] Gemini 2.5 Flash connected (Live API)' },
    { type: 'normal', text: '[agent] Joining Stream call as guidesight-coach' },
    { type: 'success', text: '[agent] Coaching session active - 1fps vision' },
    { type: 'success', text: '[coach] "I can see your workspace. Let\'s begin!"' },
  ];

  useEffect(() => {
    if (!isInView || lines >= allLines.length) return;
    const timer = setTimeout(() => setLines(l => l + 1), 120);
    return () => clearTimeout(timer);
  }, [isInView, lines, allLines.length]);

  return (
    <div ref={ref} className="terminal-window max-w-lg w-full text-left">
      <div className="terminal-header">
        <div className="terminal-dot" style={{ background: '#ef4444' }} />
        <div className="terminal-dot" style={{ background: '#f59e0b' }} />
        <div className="terminal-dot" style={{ background: '#22c55e' }} />
        <span className="text-[11px] text-[var(--text-tertiary)] ml-2 font-mono">guidesight-agent</span>
      </div>
      <div className="terminal-body" style={{ minHeight: '220px' }}>
        {allLines.slice(0, lines).map((line, i) => (
          <div key={i} className={`line-${line.type}`} style={{
            animation: 'fade-in 0.15s ease-out both',
          }}>
            {line.text}
          </div>
        ))}
        {lines < allLines.length && lines > 0 && (
          <span className="typewriter-cursor" />
        )}
      </div>
    </div>
  );
}

// --- Sections ---

function NavBar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled
        ? 'border-b border-[var(--border)] bg-[var(--bg-primary)]/80 backdrop-blur-xl'
        : 'border-b border-transparent bg-transparent'
    }`}>
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <a href="#" className="text-xl font-bold tracking-tight">
            <span className="text-gradient">Guide</span>Sight
          </a>
          <div className="hidden md:flex items-center gap-6">
            <a href="#features" className="nav-link text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">Features</a>
            <a href="#how-it-works" className="nav-link text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">How It Works</a>
            <a href="#use-cases" className="nav-link text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">Use Cases</a>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <a href="#admin" className="nav-link text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors hidden md:inline">
            Admin
          </a>
          <a href="#analytics" className="btn-secondary !py-2 !px-4 !text-[13px]">
            Dashboard
          </a>
        </div>
      </div>
    </nav>
  );
}

function HeroSection({ onSelectPortal, onSelectWorker }: LandingPageProps) {
  return (
    <section className="relative pt-32 pb-20 md:pt-44 md:pb-28 px-6 overflow-hidden noise-overlay">
      {/* Ambient glow */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[var(--accent)] opacity-[0.04] blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-4xl mx-auto text-center relative z-10">
        {/* Badge with breathing ring */}
        <div className="animate-fade-in inline-flex items-center gap-2 bg-[var(--accent-subtle)] border border-[var(--accent)]/20 rounded-full px-4 py-1.5 mb-8">
          <div className="w-2 h-2 rounded-full bg-[var(--accent)] breathe-ring" />
          <span className="text-xs font-medium text-[var(--accent)]">Powered by Gemini 2.5 Flash + Computer Vision</span>
        </div>

        {/* Hero text: shimmer on first line, rotating phrase on second */}
        <h1 className="animate-fade-in text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.08] mb-6" style={{ animationDelay: '100ms', letterSpacing: '-0.03em' }}>
          <span className="text-shimmer">AI that watches your hands</span>{' '}
          <br className="hidden md:block" />
          <span className="block h-[1.5em] overflow-hidden">
            <RotatingText />
          </span>
        </h1>

        <p className="animate-fade-in text-lg md:text-xl text-[var(--text-secondary)] max-w-2xl mx-auto mb-10 leading-relaxed" style={{ animationDelay: '200ms' }}>
          Real-time AI coaching for physical tasks. Point your camera at your workspace — GuideSight sees what you see and talks you through every step.
        </p>

        {/* CTAs with magnetic effect */}
        <div className="animate-fade-in flex flex-col sm:flex-row items-center justify-center gap-4" style={{ animationDelay: '300ms' }}>
          <MagneticButton onClick={onSelectWorker} className="btn-primary !py-3.5 !px-8 !text-base">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
            </svg>
            Start Training
          </MagneticButton>
          <MagneticButton onClick={onSelectPortal} className="btn-secondary !py-3.5 !px-8 !text-base">
            Company Portal
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </MagneticButton>
        </div>

        {/* Scroll hint */}
        <div className="animate-fade-in mt-14 flex flex-col items-center gap-2" style={{ animationDelay: '1200ms' }}>
          <span className="text-[11px] text-[var(--text-tertiary)] uppercase tracking-widest">Scroll to explore</span>
          <svg className="w-5 h-5 text-[var(--text-tertiary)] scroll-hint" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5 12 21m0 0-7.5-7.5M12 21V3" />
          </svg>
        </div>

        {/* Hero visual — animated coaching preview with gradient border */}
        <div className="animate-fade-in-slow mt-12 relative max-w-3xl mx-auto" style={{ animationDelay: '500ms' }}>
          {/* Animated gradient border wrapper */}
          <div className="p-px rounded-2xl bg-gradient-to-r from-[var(--accent)]/40 via-purple-500/20 to-[var(--accent)]/40 animate-gradient">
            <div className="relative rounded-2xl overflow-hidden bg-[var(--bg-secondary)] shadow-2xl shadow-black/40">
              {/* Browser chrome */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-card)]">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-[var(--error)]/60" />
                  <div className="w-3 h-3 rounded-full bg-[var(--warning)]/60" />
                  <div className="w-3 h-3 rounded-full bg-[var(--success)]/60" />
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="bg-[var(--bg-primary)] rounded-lg px-4 py-1 text-[11px] text-[var(--text-tertiary)] font-mono flex items-center gap-1.5">
                    <svg className="w-3 h-3 text-[var(--success)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                    </svg>
                    guidesight.ai/session
                  </div>
                </div>
              </div>
              {/* Mock coaching UI */}
              <div className="flex">
                <div className="flex-1 aspect-[16/9] bg-gradient-to-br from-zinc-900 to-zinc-950 relative overflow-hidden">
                  {/* Animated fake video content */}
                  <div className="absolute inset-3 rounded-xl bg-gradient-to-br from-zinc-800/60 to-zinc-900/60 border border-white/[0.04]">
                    {/* Simulated hands workspace */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="relative">
                        {/* Paper silhouette */}
                        <div className="w-32 h-24 bg-white/[0.06] rounded border border-white/[0.08] rotate-2" />
                        {/* Hand indicators */}
                        <div className="absolute -bottom-2 -left-4 w-8 h-8 rounded-full border-2 border-[var(--accent)]/40 animate-pulse" style={{ animationDuration: '2s' }} />
                        <div className="absolute -bottom-2 -right-4 w-8 h-8 rounded-full border-2 border-[var(--accent)]/40 animate-pulse" style={{ animationDuration: '2s', animationDelay: '0.5s' }} />
                        {/* MediaPipe hand label */}
                        <div className="absolute -bottom-7 -left-6 text-[8px] text-[var(--accent)]/70 font-mono">LEFT</div>
                        <div className="absolute -bottom-7 -right-7 text-[8px] text-[var(--accent)]/70 font-mono">RIGHT</div>
                        {/* CV annotation lines */}
                        <div className="absolute top-1/2 left-0 right-0 border-t border-dashed border-emerald-500/30" />
                        <div className="absolute top-0 left-1/2 bottom-0 border-l border-dashed border-emerald-500/30" />
                        <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[8px] text-emerald-400/70 font-mono bg-black/40 px-1 rounded">LANDSCAPE</div>
                      </div>
                    </div>
                  </div>
                  {/* Overlays */}
                  <div className="absolute top-4 left-4 bg-black/60 backdrop-blur rounded-full px-3 py-1 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-[11px] font-medium">Step 3/6</span>
                  </div>
                  <div className="absolute top-4 right-4 bg-black/60 backdrop-blur rounded-full px-3 py-1 flex items-center gap-2">
                    <span className="text-[11px] font-mono tabular-nums">02:34</span>
                  </div>
                  <div className="absolute bottom-4 left-4 right-4 bg-black/60 backdrop-blur rounded-lg px-3 py-2.5 flex items-center gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[var(--accent)]/20 flex items-center justify-center">
                      <svg className="w-4 h-4 text-[var(--accent)]" fill="currentColor" viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-[11px] font-medium text-[var(--accent)]">AI Coach speaking</p>
                        <div className="flex items-center gap-[3px]">
                          {[3, 5, 3.5, 4.5, 2.5].map((h, i) => (
                            <div key={i} className="w-[3px] rounded-full bg-[var(--accent)] animate-pulse" style={{ height: `${h * 2}px`, animationDelay: `${i * 150}ms` }} />
                          ))}
                        </div>
                      </div>
                      <p className="text-xs text-white/80">Good, now fold the top edge down to meet the center crease...</p>
                    </div>
                  </div>
                </div>
                {/* Step tracker */}
                <div className="w-52 border-l border-[var(--border)] bg-[var(--bg-card)]/50 p-4 hidden md:block">
                  <p className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] mb-1.5 font-semibold">Progress</p>
                  <div className="h-1 bg-white/5 rounded-full mb-3 overflow-hidden">
                    <div className="h-full w-[40%] bg-gradient-to-r from-[var(--accent)] to-purple-500 rounded-full" />
                  </div>
                  {['Flatten paper', 'Center crease', 'Fold corners', 'Fold down', 'Wing folds', 'Final shape'].map((s, i) => (
                    <div key={i} className="flex items-center gap-2 mb-2.5">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold transition-all duration-300 ${
                        i < 2 ? 'bg-[var(--success)] text-black' : i === 2 ? 'bg-[var(--accent)] text-white shadow-[0_0_6px_var(--accent-glow)]' : 'bg-white/[0.06] text-[var(--text-tertiary)]'
                      }`}>
                        {i < 2 ? (
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                        ) : i + 1}
                      </div>
                      <span className={`text-[11px] ${i === 2 ? 'text-[var(--text-primary)] font-medium' : i < 2 ? 'text-[var(--text-tertiary)] line-through' : 'text-[var(--text-tertiary)]'}`}>{s}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          {/* Gradient shadow */}
          <div className="absolute -bottom-4 left-[10%] right-[10%] h-8 bg-[var(--accent)] opacity-[0.08] blur-2xl rounded-full" />
        </div>
      </div>
    </section>
  );
}

// --- Tech logos strip with hover lift ---
function TechLogosSection() {
  const logos = [
    { name: 'Gemini 2.5 Flash', icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
      </svg>
    )},
    { name: 'WebRTC', icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
      </svg>
    )},
    { name: 'OpenCV', icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
      </svg>
    )},
    { name: 'MediaPipe', icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.05 4.575a1.575 1.575 0 1 0-3.15 0v3m3.15-3v-1.5a1.575 1.575 0 0 1 3.15 0v1.5m-3.15 0 .075 5.925m3.075.75V4.575m0 0a1.575 1.575 0 0 1 3.15 0V15M6.9 7.575a1.575 1.575 0 1 0-3.15 0v8.175a6.75 6.75 0 0 0 6.75 6.75h2.018a5.25 5.25 0 0 0 3.712-1.538l1.732-1.732a5.25 5.25 0 0 0 1.538-3.712l.003-2.024a.668.668 0 0 0-.67-.668 2.665 2.665 0 0 0-2.659 2.669v0" />
      </svg>
    )},
    { name: 'Stream Video', icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    )},
    { name: 'Shisa AI', icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 21l5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 0 1 6-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.148 15.08 2 17.84m15.334-12.476A48.613 48.613 0 0 1 22 5.7" />
      </svg>
    )},
    { name: 'VoiceOS', icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
      </svg>
    )},
    { name: 'Cactus Compute', icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 0 0 2.25-2.25V6.75a2.25 2.25 0 0 0-2.25-2.25H6.75A2.25 2.25 0 0 0 4.5 6.75v10.5a2.25 2.25 0 0 0 2.25 2.25Z" />
      </svg>
    )},
    { name: 'Superset', icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0 0 21 18V6a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 6v12a2.25 2.25 0 0 0 2.25 2.25Z" />
      </svg>
    )},
  ];

  return (
    <Reveal>
      <section className="py-10 border-y border-[var(--border)]">
        <div className="max-w-5xl mx-auto px-6">
          <p className="text-center text-[11px] uppercase tracking-widest text-[var(--text-tertiary)] font-semibold mb-6">Built with</p>
          <div className="flex items-center justify-center gap-8 md:gap-14 flex-wrap">
            {logos.map((l) => (
              <span
                key={l.name}
                className="flex items-center gap-2 text-sm font-medium text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-all duration-200 cursor-default hover:-translate-y-0.5"
              >
                {l.icon}
                {l.name}
              </span>
            ))}
          </div>
        </div>
      </section>
    </Reveal>
  );
}

// --- Stats ---
function StatsSection() {
  const stats = [
    { value: '$200B+', label: 'Field service market' },
    { value: '8M', label: 'Unfilled skilled jobs in the US' },
    { value: '50%', label: 'Faster training with AI coaching' },
    { value: '1fps', label: 'Real-time vision processing' },
  ];

  return (
    <section className="py-16">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((s, i) => (
            <Reveal key={s.label} delay={i * 100}>
              <div className="text-center group">
                <p className="text-3xl md:text-4xl font-bold text-gradient mb-2 group-hover:scale-105 transition-transform duration-300">
                  <AnimatedNumber value={s.value} />
                </p>
                <p className="text-sm text-[var(--text-secondary)]">{s.label}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// --- Before/After comparison ---
function ComparisonSection() {
  return (
    <Reveal>
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-sm font-semibold text-[var(--accent)] mb-3 uppercase tracking-wider">Why GuideSight</p>
            <h2 className="text-3xl md:text-4xl font-bold" style={{ letterSpacing: '-0.02em' }}>
              From static instructions to <span className="text-gradient">live coaching</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Before */}
            <div className="glass-card p-6 opacity-60 relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-[var(--text-tertiary)]/10 text-[var(--text-tertiary)] text-[10px] font-semibold uppercase tracking-wider px-3 py-1 rounded-bl-lg">Traditional</div>
              <h3 className="font-semibold text-lg mb-4 text-[var(--text-secondary)]">Static Training</h3>
              <div className="space-y-3">
                {[
                  'Record once, replay forever',
                  'No error detection',
                  'Months to onboard new workers',
                  'Knowledge lost when experts leave',
                  'One-size-fits-all instructions',
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3 text-sm text-[var(--text-tertiary)]">
                    <svg className="w-4 h-4 flex-shrink-0 text-[var(--text-tertiary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                    {item}
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-[var(--border)] text-xs text-[var(--text-tertiary)]">
                Squint, DeepHow, Dozuki, Tulip
              </div>
            </div>

            {/* After */}
            <div className="glass-card p-6 border-[var(--accent)]/20 shadow-[0_0_40px_var(--accent-glow)] relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-[var(--accent)]/10 text-[var(--accent)] text-[10px] font-semibold uppercase tracking-wider px-3 py-1 rounded-bl-lg">GuideSight</div>
              <h3 className="font-semibold text-lg mb-4">Real-Time AI Coaching</h3>
              <div className="space-y-3">
                {[
                  'AI watches live and coaches in real-time',
                  'Catches mistakes before they compound',
                  'Minutes to start, not months',
                  'AI retains institutional knowledge forever',
                  'Adapts coaching to what it sees',
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3 text-sm">
                    <svg className="w-4 h-4 flex-shrink-0 text-[var(--success)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    {item}
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-[var(--accent)]/10 text-xs text-[var(--accent)]">
                The only platform with live vision + voice coaching
              </div>
            </div>
          </div>
        </div>
      </section>
    </Reveal>
  );
}

// --- Features with glow cards ---
function FeaturesSection() {
  const features = [
    {
      icon: <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />,
      icon2: <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />,
      title: 'Computer Vision',
      desc: 'OpenCV, MediaPipe, and YOLO process each frame — detecting objects, tracking hands, and annotating spatial details that raw AI misses.',
    },
    {
      icon: <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />,
      title: 'Natural Voice Coaching',
      desc: 'Bidirectional audio via Gemini Live API. No buttons, no turn-taking — continuous conversation like talking to a real instructor.',
    },
    {
      icon: <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456Z" />,
      title: 'Gemini 2.5 Flash',
      desc: 'The only model with continuous video + audio streaming. Sees your workspace at 1fps and reasons about what you\'re doing.',
    },
    {
      icon: <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />,
      title: 'Analytics Dashboard',
      desc: 'Track error patterns, worker progress, and training efficiency. Identify which steps need better documentation.',
    },
    {
      icon: <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.336l-3.276 3.277a3.004 3.004 0 0 1-2.25-2.25l3.276-3.276a4.5 4.5 0 0 0-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437 1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008Z" />,
      title: 'Any Physical Task',
      desc: 'Paper folding, circuit building, HVAC repair, medical procedures. Different CV "glasses" for each domain, same brain.',
    },
    {
      icon: <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />,
      title: 'Error Detection',
      desc: 'AI catches mistakes in real-time and guides corrections before they compound. Tracks error patterns for improvement.',
    },
  ];

  return (
    <section id="features" className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <Reveal>
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-[var(--accent)] mb-3 uppercase tracking-wider">Platform</p>
            <h2 className="text-3xl md:text-5xl font-bold mb-4" style={{ letterSpacing: '-0.02em' }}>
              Everything you need for<br />AI-guided physical work
            </h2>
            <p className="text-[var(--text-secondary)] text-lg max-w-2xl mx-auto">
              Gemini is the brain. CV tools are the glasses. Together, they create the first real-time coaching engine for skilled trades.
            </p>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <Reveal key={f.title} delay={i * 80}>
              <GlowCard className="p-6 h-full">
                <div className="w-11 h-11 rounded-xl bg-[var(--accent-subtle)] flex items-center justify-center mb-4 text-[var(--accent)] group-hover:bg-[var(--accent)]/20 transition-colors duration-300">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    {f.icon}
                    {f.icon2}
                  </svg>
                </div>
                <h3 className="font-semibold text-base mb-2">{f.title}</h3>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{f.desc}</p>
              </GlowCard>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// --- Architecture diagram ---
function ArchitectureSection() {
  const steps = [
    { label: 'Camera', sub: 'Raw 1fps frames', color: 'var(--text-secondary)' },
    { label: 'CV Glasses', sub: 'OpenCV + MediaPipe', color: 'var(--success)' },
    { label: 'Annotated Frame', sub: 'Labels + overlays', color: 'var(--warning)' },
    { label: 'Gemini 2.5', sub: 'Reasons + coaches', color: 'var(--accent)' },
    { label: 'Voice Output', sub: 'Natural speech', color: 'var(--gradient-end)' },
  ];

  return (
    <Reveal>
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <p className="text-center text-sm text-[var(--accent)] font-semibold uppercase tracking-wider mb-4">Architecture</p>
          <p className="text-center text-xl md:text-2xl font-bold mb-2" style={{ letterSpacing: '-0.02em' }}>
            "Gemini can reason but can't measure.
          </p>
          <p className="text-center text-xl md:text-2xl font-bold mb-10" style={{ letterSpacing: '-0.02em' }}>
            Our CV layer measures, <span className="text-gradient">Gemini reasons.</span>"
          </p>

          {/* Pipeline */}
          <div className="flex items-center justify-between gap-2 overflow-x-auto pb-4">
            {steps.map((s, i) => (
              <div key={s.label} className="flex items-center gap-2 flex-shrink-0">
                <div className="glass-card px-4 py-3 text-center min-w-[100px] hover:border-[rgba(255,255,255,0.12)] transition-all duration-200 hover:-translate-y-0.5">
                  <p className="text-xs font-semibold" style={{ color: s.color }}>{s.label}</p>
                  <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">{s.sub}</p>
                </div>
                {i < steps.length - 1 && (
                  <svg className="w-5 h-5 text-[var(--text-tertiary)] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                  </svg>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
    </Reveal>
  );
}

// --- #7: Terminal social proof section ---
function SocialProofSection() {
  return (
    <Reveal>
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            {/* Left: Terminal */}
            <div className="flex justify-center">
              <TerminalBlock />
            </div>

            {/* Right: Description */}
            <div>
              <p className="text-sm font-semibold text-[var(--accent)] mb-3 uppercase tracking-wider">Developer Experience</p>
              <h3 className="text-2xl md:text-3xl font-bold mb-4" style={{ letterSpacing: '-0.02em' }}>
                From task JSON to<br />live coaching in <span className="text-gradient">seconds</span>
              </h3>
              <p className="text-[var(--text-secondary)] leading-relaxed mb-6">
                Define your task steps in a simple JSON file. The agent loads your task, connects CV processors, and starts coaching through Gemini's Live API. No model training required.
              </p>
              {/* Inline code snippet */}
              <div className="glass-card p-4 font-mono text-xs leading-relaxed">
                <div className="text-[var(--text-tertiary)]">{'// task definition'}</div>
                <div>
                  <span className="text-purple-400">{'{'}</span>
                  <span className="text-[var(--text-tertiary)]"> "id"</span>
                  <span className="text-[var(--text-secondary)]">:</span>
                  <span className="text-emerald-400"> "paper_airplane"</span>
                  <span className="text-[var(--text-secondary)]">,</span>
                </div>
                <div className="pl-3">
                  <span className="text-[var(--text-tertiary)]">"steps"</span>
                  <span className="text-[var(--text-secondary)]">:</span>
                  <span className="text-[var(--accent)]"> [6 steps]</span>
                  <span className="text-[var(--text-secondary)]">,</span>
                </div>
                <div className="pl-3">
                  <span className="text-[var(--text-tertiary)]">"cv_processors"</span>
                  <span className="text-[var(--text-secondary)]">:</span>
                  <span className="text-emerald-400"> ["opencv", "mediapipe"]</span>
                </div>
                <div><span className="text-purple-400">{'}'}</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </Reveal>
  );
}

// --- Use cases tabs ---
function UseCasesSection() {
  const cases = [
    { id: 'origami', title: 'Paper Folding', desc: 'Origami, paper airplanes, packaging assembly. CV detects paper orientation, fold lines, and hand position.', tools: ['OpenCV', 'MediaPipe Hands', 'Edge Detection'], icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
      </svg>
    )},
    { id: 'electronics', title: 'Circuit Building', desc: 'LED circuits, PCB assembly, wiring harnesses. Zero-shot detection identifies components by name.', tools: ['YOLO-World', 'Color Segmentation', 'Hand Tracking'], icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.383a14.406 14.406 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 1 0-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
      </svg>
    )},
    { id: 'hvac', title: 'HVAC Repair', desc: 'Valve positioning, pipe connections, filter replacement. Depth estimation and pose detection guide spatial tasks.', tools: ['YOLO', 'Depth Estimation', 'ArUco Markers'], icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.336l-3.276 3.277a3.004 3.004 0 0 1-2.25-2.25l3.276-3.276a4.5 4.5 0 0 0-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085" />
      </svg>
    )},
    { id: 'medical', title: 'Medical Procedures', desc: 'Hand hygiene, instrument handling, body positioning. Pose and hand tracking ensure proper technique.', tools: ['MediaPipe Pose', 'Hand Tracking', 'CLIP Verification'], icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
      </svg>
    )},
  ];

  const [active, setActive] = useState(0);
  const current = cases[active];

  return (
    <Reveal>
      <section id="use-cases" className="py-24 px-6 bg-[var(--bg-secondary)]/30 noise-overlay relative">
        <div className="max-w-5xl mx-auto relative z-10">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold text-[var(--accent)] mb-3 uppercase tracking-wider">Use Cases</p>
            <h2 className="text-3xl md:text-4xl font-bold" style={{ letterSpacing: '-0.02em' }}>
              Different glasses, <span className="text-gradient">same brain</span>
            </h2>
          </div>

          {/* Tabs */}
          <div className="flex justify-center gap-2 mb-8 flex-wrap">
            {cases.map((c, i) => (
              <button
                key={c.id}
                onClick={() => setActive(i)}
                className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                  active === i
                    ? 'bg-[var(--accent)] text-white shadow-[0_0_20px_var(--accent-glow)]'
                    : 'bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)] hover:border-[var(--border-hover)]'
                }`}
              >
                {c.icon}
                {c.title}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="glass-card p-8 text-center transition-all duration-300">
            <h3 className="text-xl font-bold mb-3">{current.title}</h3>
            <p className="text-[var(--text-secondary)] max-w-xl mx-auto mb-6 leading-relaxed">{current.desc}</p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              {current.tools.map((t) => (
                <span key={t} className="text-xs font-medium bg-[var(--accent-subtle)] text-[var(--accent)] px-3 py-1.5 rounded-full border border-[var(--accent)]/20">
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>
    </Reveal>
  );
}

function HowItWorksSection() {
  const steps = [
    { num: '01', title: 'Create a task', desc: 'Define steps, expected outcomes, and common errors — or let AI generate them from a PDF, photo, or voice description.' },
    { num: '02', title: 'Worker starts session', desc: 'Point the camera at your workspace. The AI coach joins via WebRTC — real-time video in, voice coaching out.' },
    { num: '03', title: 'AI coaches live', desc: 'CV tools annotate each frame. Gemini reasons about the annotations and talks the worker through every step naturally.' },
    { num: '04', title: 'Track & improve', desc: 'Analytics dashboard shows error hotspots, worker progress, and training efficiency. Continuously improve.' },
  ];

  return (
    <section id="how-it-works" className="py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <Reveal>
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-[var(--accent)] mb-3 uppercase tracking-wider">Process</p>
            <h2 className="text-3xl md:text-5xl font-bold" style={{ letterSpacing: '-0.02em' }}>How it works</h2>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {steps.map((s, i) => (
            <Reveal key={s.num} delay={i * 100}>
              <GlowCard className="p-6 flex gap-5 h-full">
                <div className="text-3xl font-extrabold text-gradient leading-none pt-1 tabular-nums">{s.num}</div>
                <div>
                  <h3 className="font-semibold text-base mb-1.5">{s.title}</h3>
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{s.desc}</p>
                </div>
              </GlowCard>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// --- #8: CTA with keyboard shortcut ---
function CtaSection({ onSelectWorker }: { onSelectWorker: () => void }) {
  // Keyboard shortcut: press D to start demo
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'd' || e.key === 'D') {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
        onSelectWorker();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onSelectWorker]);

  return (
    <Reveal>
      <section className="py-28 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[var(--accent)]/[0.03] to-transparent pointer-events-none" />
        <div className="max-w-3xl mx-auto text-center relative z-10">
          <h2 className="text-3xl md:text-5xl font-bold mb-5" style={{ letterSpacing: '-0.03em' }}>
            The skilled workforce,<br /><span className="text-gradient">on demand</span>
          </h2>
          <p className="text-[var(--text-secondary)] text-lg mb-10 max-w-xl mx-auto">
            Stop losing institutional knowledge when experts retire. GuideSight turns any physical task into an AI-coached training session.
          </p>
          <div className="flex flex-col items-center gap-3">
            <MagneticButton onClick={onSelectWorker} className="btn-primary !py-4 !px-10 !text-base">
              Try the Demo
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </MagneticButton>
            <span className="text-[11px] text-[var(--text-tertiary)] flex items-center gap-1.5">
              or press <span className="kbd">D</span> to start
            </span>
          </div>
        </div>
      </section>
    </Reveal>
  );
}

// --- #9: Hackathon credibility bar ---
function HackathonBar() {
  return (
    <Reveal>
      <section className="py-8 px-6 border-t border-[var(--border)]">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8">
          <div className="inline-flex items-center gap-2 bg-[var(--accent-subtle)] border border-[var(--accent)]/20 rounded-full px-4 py-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
            <span className="text-xs font-medium text-[var(--accent)]">c0mpiled San Fransokyo 2026</span>
          </div>
          <span className="text-xs text-[var(--text-tertiary)]">YC RFS Spring 2026: "AI Guidance for Physical Work"</span>
          <div className="inline-flex items-center gap-2 bg-[var(--bg-card)] border border-[var(--border)] rounded-full px-4 py-1.5">
            <span className="text-xs font-medium text-[var(--text-secondary)]">Gemini Live Agent Challenge</span>
          </div>
        </div>
      </section>
    </Reveal>
  );
}

// --- #10: Premium footer ---
function Footer() {
  return (
    <footer className="footer-glow py-12 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8 mb-8">
          {/* Brand */}
          <div>
            <span className="text-lg font-bold">
              <span className="text-gradient">Guide</span>Sight
            </span>
            <p className="text-xs text-[var(--text-tertiary)] mt-1.5 max-w-xs">
              Real-time AI coaching for physical work. Gemini reasons, CV measures.
            </p>
          </div>

          {/* Links */}
          <div className="flex items-center gap-6 text-xs">
            <a href="#features" className="nav-link text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors">Features</a>
            <a href="#how-it-works" className="nav-link text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors">How It Works</a>
            <a href="#use-cases" className="nav-link text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors">Use Cases</a>
            <a href="#admin" className="nav-link text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors">Admin</a>
            <a href="#analytics" className="nav-link text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors">Analytics</a>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-6 border-t border-[var(--border)]">
          <div className="flex items-center gap-4">
            <span className="text-xs text-[var(--text-tertiary)]">Built with Gemini 2.5 Flash + WebRTC + Computer Vision</span>
          </div>
          <div className="flex items-center gap-3">
            {/* GitHub-style badge */}
            <div className="inline-flex items-center gap-1.5 bg-[var(--bg-card)] border border-[var(--border)] rounded-md px-2.5 py-1 text-[11px] text-[var(--text-tertiary)] hover:border-[var(--border-hover)] transition-colors cursor-default">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              Open Source
            </div>
            {/* Hackathon year */}
            <span className="text-[11px] text-[var(--text-tertiary)]">March 2026</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

// --- #11: Glow divider component ---
function GlowDivider() {
  return <div className="section-glow-divider" />;
}

export function LandingPage({ onSelectPortal, onSelectWorker }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-grid bg-mesh" style={{ scrollBehavior: 'smooth' }}>
      <NavBar />
      <HeroSection onSelectPortal={onSelectPortal} onSelectWorker={onSelectWorker} />
      <TechLogosSection />
      <StatsSection />
      <GlowDivider />
      <ComparisonSection />
      <FeaturesSection />
      <GlowDivider />
      <ArchitectureSection />
      <SocialProofSection />
      <GlowDivider />
      <UseCasesSection />
      <HowItWorksSection />
      <CtaSection onSelectWorker={onSelectWorker} />
      <HackathonBar />
      <Footer />
      <StickyCta onClick={onSelectWorker} />
    </div>
  );
}
