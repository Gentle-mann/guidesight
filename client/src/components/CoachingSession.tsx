import { useEffect, useRef, useState, useCallback, Component, type ReactNode } from 'react';
import { useCallStateHooks, useCall, ParticipantView, CallStats } from '@stream-io/video-react-sdk';
import { Toaster, toast } from 'sonner';
import { useHotkeys } from 'react-hotkeys-hook';
import confetti from 'canvas-confetti';
import { StepTracker } from './StepTracker';
import type { TaskDetail } from '../types';

// --- Error Boundary (Tier 1.5) ---

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class SessionErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="min-h-screen flex items-center justify-center">
            <div className="bg-[var(--bg-card)] rounded-2xl p-8 max-w-md text-center">
              <div className="w-12 h-12 rounded-full bg-[var(--error)]/20 flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-[var(--error)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="font-semibold text-lg mb-2">Session Error</h3>
              <p className="text-[var(--text-secondary)] text-sm mb-4">
                {this.state.error?.message || 'Something went wrong during the coaching session.'}
              </p>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-2 bg-[var(--accent)] rounded-lg text-white font-medium"
              >
                Reload Session
              </button>
            </div>
          </div>
        )
      );
    }
    return this.props.children;
  }
}

// --- Session Timer Hook (Tier 2.5) ---

function useSessionTimer() {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');
  return { elapsed: `${mm}:${ss}`, totalSeconds: seconds };
}

// --- Audio Waveform Visualizer (Tier 2.3) ---

function AudioWaveform({ audioRef }: { audioRef: React.RefObject<HTMLAudioElement | null> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const el = audioRef.current;
    const canvas = canvasRef.current;
    if (!el || !canvas) return;

    // P5.3: DPI-aware canvas
    const dpr = window.devicePixelRatio || 1;
    const cssW = 30, cssH = 20;
    canvas.width = cssW * dpr;
    canvas.height = cssH * dpr;
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;

    const setup = () => {
      if (!el.srcObject) return;
      try {
        const ctx = new AudioContext();
        const source = ctx.createMediaElementSource(el);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 32;
        source.connect(analyser);
        analyser.connect(ctx.destination);
        analyserRef.current = analyser;
      } catch {
        // Already connected
      }
    };

    setup();
    el.addEventListener('play', setup);

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);
      if (!analyserRef.current || !canvas) return;

      const bufLen = analyserRef.current.frequencyBinCount;
      const data = new Uint8Array(bufLen);
      analyserRef.current.getByteFrequencyData(data);

      const drawCtx = canvas.getContext('2d');
      if (!drawCtx) return;

      const w = canvas.width;
      const h = canvas.height;
      drawCtx.clearRect(0, 0, w, h);
      drawCtx.scale(dpr, dpr);

      const barCount = Math.min(bufLen, 5);
      const barWidth = 3;
      const gap = 2;
      const totalWidth = barCount * barWidth + (barCount - 1) * gap;
      const startX = (cssW - totalWidth) / 2;

      for (let i = 0; i < barCount; i++) {
        const val = data[i] / 255;
        const barH = Math.max(3, val * (cssH - 4));
        const x = startX + i * (barWidth + gap);
        const y = (cssH - barH) / 2;

        drawCtx.fillStyle = `rgba(108, 99, 255, ${0.5 + val * 0.5})`;
        drawCtx.beginPath();
        drawCtx.roundRect(x, y, barWidth, barH, 1.5);
        drawCtx.fill();
      }

      drawCtx.setTransform(1, 0, 0, 1, 0, 0);
    };

    draw();

    return () => {
      cancelAnimationFrame(rafRef.current);
      el.removeEventListener('play', setup);
    };
  }, [audioRef]);

  return <canvas ref={canvasRef} className="inline-block" />;
}

// --- Main Component ---

interface CoachingSessionProps {
  task: TaskDetail;
  onEndSession?: () => void;
}

export function CoachingSession({ task, onEndSession }: CoachingSessionProps) {
  return (
    <SessionErrorBoundary>
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: 'var(--bg-card)',
            color: 'var(--text-primary)',
            border: '1px solid rgba(255,255,255,0.1)',
          },
        }}
      />
      <CoachingSessionInner task={task} onEndSession={onEndSession} />
    </SessionErrorBoundary>
  );
}

function CoachingSessionInner({ task, onEndSession }: CoachingSessionProps) {
  const { useLocalParticipant, useRemoteParticipants } = useCallStateHooks();
  const localParticipant = useLocalParticipant();
  const remoteParticipants = useRemoteParticipants();
  const [currentStep, setCurrentStep] = useState(1);
  const [taskComplete, setTaskComplete] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const call = useCall();
  const { elapsed, totalSeconds } = useSessionTimer();

  useEffect(() => {
    return () => {
      try { call?.leave(); } catch {}
    };
  }, [call]);

  const [caption, setCaption] = useState('');
  const captionTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);
  const agentAudioRef = useRef<HTMLAudioElement>(null);

  const [showStats, setShowStats] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);

  const toggleMic = useCallback(() => {
    call?.microphone.toggle();
    setIsMuted((m) => !m);
  }, [call]);

  useHotkeys('m', () => {
    toggleMic();
    toast(isMuted ? 'Mic unmuted' : 'Mic muted', { duration: 1500 });
  });
  useHotkeys('shift+d', () => setShowStats((v) => !v));
  useHotkeys('shift+/', () => setShowShortcuts((v) => !v));
  useHotkeys('escape', () => { setShowShortcuts(false); setShowEndConfirm(false); });

  // Tier 2.8: Border glow state
  const [glowType, setGlowType] = useState<'none' | 'success' | 'error'>('none');
  const glowTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  const triggerGlow = useCallback((type: 'success' | 'error') => {
    setGlowType(type);
    if (glowTimeout.current) clearTimeout(glowTimeout.current);
    glowTimeout.current = setTimeout(() => setGlowType('none'), 2000);
  }, []);

  // Tier 1.2: Agent connection timeout
  const [agentTimeout, setAgentTimeout] = useState(false);
  const agentParticipant = remoteParticipants.find(
    (p) => p.userId === 'guidesight-coach'
  );

  useEffect(() => {
    if (agentParticipant) {
      setAgentTimeout(false);
      return;
    }
    const timer = setTimeout(() => setAgentTimeout(true), 60_000);
    return () => clearTimeout(timer);
  }, [agentParticipant]);

  // Tier 2.1: Confetti on task complete
  const fireConfetti = useCallback(() => {
    const colors = ['#6c63ff', '#4ade80', '#fbbf24', '#f87171'];
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors });
    setTimeout(() => {
      confetti({ particleCount: 50, angle: 60, spread: 55, origin: { x: 0 }, colors });
      confetti({ particleCount: 50, angle: 120, spread: 55, origin: { x: 1 }, colors });
    }, 250);
  }, []);

  // Tier 1.1 + 2.7: Handle ALL custom events from the agent
  useEffect(() => {
    if (!call) return;
    const unsubscribe = call.on('custom', (event: any) => {
      const data = event.custom;
      if (!data?.type) return;

      switch (data.type) {
        case 'step_complete':
          setCurrentStep(data.current_step);
          triggerGlow('success');
          // 7.8: Haptic feedback
          navigator.vibrate?.(200);
          if (data.task_complete) {
            setTaskComplete(true);
            fireConfetti();
            navigator.vibrate?.([200, 100, 200]);
          } else {
            toast.success(`Step ${data.step} complete`, { duration: 2000 });
          }
          break;

        case 'step_regression':
          setCurrentStep(data.to_step);
          toast('Moved back to step ' + data.to_step, {
            duration: 3000,
            icon: '↩',
          });
          break;

        case 'error_flagged':
          triggerGlow('error');
          toast.error(data.description || `Error at step ${data.step}`, {
            duration: 4000,
          });
          break;

        // Tier 2.7: Live captions from agent speech
        case 'agent_caption':
          if (data.text) {
            setCaption(data.text);
            if (captionTimeout.current) clearTimeout(captionTimeout.current);
            captionTimeout.current = setTimeout(() => setCaption(''), 6000);
          }
          break;
      }
    });
    return () => { unsubscribe(); };
  }, [call, triggerGlow, fireConfetti]);

  const taskSteps = task.steps.map((s) => ({
    step: s.step,
    title: s.instruction.split('.')[0],
    short: s.visual_cue.length > 40 ? s.visual_cue.slice(0, 40) + '...' : s.visual_cue,
  }));

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    if (m === 0) return `${sec} seconds`;
    return `${m}m ${sec}s`;
  };

  if (taskComplete) {
    const estTime = task.estimated_time || '';
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] bg-mesh">
        <div className="text-center animate-fade-in max-w-lg w-full px-6">
          <div className="w-20 h-20 rounded-full bg-[var(--success)]/10 flex items-center justify-center mx-auto mb-6 animate-scale-in border border-[var(--success)]/20">
            <svg className="w-10 h-10 text-[var(--success)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-4xl font-extrabold tracking-tight mb-2">Task Complete</h2>
          <p className="text-[var(--text-secondary)] text-lg mb-8">{task.name}</p>

          <div className="glass-card p-6 mb-8">
            <div className="grid grid-cols-3 gap-6">
              <div>
                <p className="text-2xl font-bold text-gradient">{formatTime(totalSeconds)}</p>
                <p className="text-xs text-[var(--text-tertiary)] mt-1.5">Time taken</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-[var(--success)]">{task.steps.length}/{task.steps.length}</p>
                <p className="text-xs text-[var(--text-tertiary)] mt-1.5">Steps done</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-[var(--text-primary)]">{estTime || '—'}</p>
                <p className="text-xs text-[var(--text-tertiary)] mt-1.5">Estimated</p>
              </div>
            </div>
          </div>

          <button onClick={() => onEndSession?.()} className="btn-primary !py-3.5 !px-10 !text-base">
            Back to Tasks
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  // Tier 2.8: Border glow class
  const glowClass =
    glowType === 'success'
      ? 'ring-2 ring-[var(--success)] shadow-[inset_0_0_30px_rgba(74,222,128,0.15)]'
      : glowType === 'error'
        ? 'ring-2 ring-[var(--error)] shadow-[inset_0_0_30px_rgba(248,113,113,0.15)]'
        : '';

  return (
    <div className="h-screen flex flex-col bg-[var(--bg-primary)]">
      {/* Main content — video + step tracker */}
      <div className="flex-1 flex flex-col md:flex-row gap-0 overflow-hidden">
        {/* Camera feed — takes ~75% of screen */}
        <div className="flex-1 relative min-h-0">
          <div className={`h-full relative overflow-hidden bg-[var(--bg-secondary)] transition-all duration-500 ${glowClass}`}>
            {localParticipant && (
              <ParticipantView
                participant={localParticipant}
                mirror={true}
                className="w-full h-full"
              />
            )}

            {/* Top-left: Step badge */}
            <div className="absolute top-3 left-3 flex items-center gap-2">
              <div className="bg-black/60 backdrop-blur-sm rounded-full px-3 py-1.5">
                <span className="text-xs font-medium">
                  Step {currentStep}/{task.steps.length}
                </span>
              </div>
            </div>

            {/* Top-right: LIVE dot + timer */}
            <div className="absolute top-3 right-3 flex items-center gap-2">
              <div className="flex items-center gap-2 bg-black/60 backdrop-blur-sm rounded-full px-3 py-1.5">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-xs font-mono">{elapsed}</span>
              </div>
            </div>

            {/* Bottom: merged caption + instruction bar */}
            <div className="absolute bottom-3 left-3 right-3 pointer-events-none space-y-2">
              {caption && (
                <div className="animate-fade-in">
                  <div className="bg-black/80 backdrop-blur-sm rounded-lg px-4 py-2 text-center">
                    <p className="text-sm leading-snug line-clamp-2">{caption}</p>
                  </div>
                </div>
              )}
              {agentParticipant && currentStep <= task.steps.length && !caption && (
                <div className="bg-black/60 backdrop-blur-sm rounded-xl px-4 py-2.5">
                  <p className="text-xs text-white/60 mb-0.5">Current step</p>
                  <p className="text-sm font-medium leading-snug line-clamp-2">
                    {task.steps[currentStep - 1]?.instruction}
                  </p>
                </div>
              )}
            </div>

            {/* Waiting for agent overlay */}
            {!agentParticipant && !agentTimeout && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                <div className="text-center">
                  <div className="w-10 h-10 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-sm font-medium">Waiting for AI Coach...</p>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">This may take a few seconds</p>
                </div>
              </div>
            )}

            {/* Agent timeout overlay */}
            {agentTimeout && !agentParticipant && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                <div className="text-center">
                  <div className="w-10 h-10 rounded-full bg-[var(--error)]/20 flex items-center justify-center mx-auto mb-3">
                    <svg className="w-5 h-5 text-[var(--error)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636a9 9 0 11-12.728 0M12 9v4m0 4h.01" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium mb-1">AI Coach Disconnected</p>
                  <p className="text-xs text-[var(--text-secondary)] mb-3">The agent may have crashed or is restarting</p>
                  <button
                    onClick={() => { setAgentTimeout(false); }}
                    className="px-4 py-1.5 bg-[var(--accent)] rounded-lg text-sm font-medium"
                  >
                    Keep Waiting
                  </button>
                </div>
              </div>
            )}

            {/* Bind agent's audio track */}
            {agentParticipant && (
              <AgentAudio
                sessionId={agentParticipant.sessionId}
                userId={agentParticipant.userId}
                audioRef={agentAudioRef}
              />
            )}
          </div>
        </div>

        {/* Step tracker sidebar */}
        <div className="md:w-80 flex-shrink-0 max-h-48 md:max-h-full overflow-hidden border-l border-[var(--border)] bg-[var(--bg-secondary)]">
          <StepTracker steps={taskSteps} currentStep={currentStep} taskId={task.id} />
        </div>
      </div>

      {/* Bottom control bar */}
      <div className="flex items-center justify-between px-5 py-3 bg-[var(--bg-secondary)] border-t border-[var(--border)]">
        {/* Left: Mute toggle */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleMic}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              isMuted
                ? 'bg-[var(--error)]/20 text-[var(--error)] hover:bg-[var(--error)]/30'
                : 'bg-white/10 text-white hover:bg-white/15'
            }`}
          >
            {isMuted ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 19L17.591 17.591L5.409 5.409L4 4" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75C8.27 18.75 5.25 15.73 5.25 12V10M18.75 10v2c0 .71-.11 1.39-.3 2.03M12 15.75a3.75 3.75 0 01-3.674-3.002M15.75 12V4.5a3.75 3.75 0 00-7.5 0v.847" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75V22.5M8.25 22.5h7.5" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
              </svg>
            )}
            <span className="hidden md:inline">{isMuted ? 'Unmute' : 'Mute'}</span>
          </button>
        </div>

        {/* Center: AI Status Orb + connection */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5 bg-[var(--bg-card)] rounded-full px-4 py-2">
            {/* AI Orb */}
            <div className={`relative w-8 h-8 rounded-full flex items-center justify-center ${
              agentParticipant ? 'bg-[var(--accent)]/20' : 'bg-white/10'
            }`}>
              <div className={`w-4 h-4 rounded-full ${
                agentParticipant
                  ? 'bg-[var(--accent)] shadow-[0_0_12px_var(--accent-glow)] animate-pulse'
                  : agentTimeout
                    ? 'bg-[var(--error)]'
                    : 'bg-[var(--warning)] animate-pulse'
              }`} />
              {agentParticipant && (
                <div className="absolute inset-0 rounded-full border-2 border-[var(--accent)]/30 animate-ping" style={{ animationDuration: '2s' }} />
              )}
            </div>
            <div className="hidden md:block">
              <p className="text-xs font-medium leading-none">AI Coach</p>
              <p className="text-[10px] text-[var(--text-secondary)] leading-none mt-0.5">
                {agentParticipant ? 'Listening' : agentTimeout ? 'Disconnected' : 'Connecting...'}
              </p>
            </div>
            {agentParticipant && <AudioWaveform audioRef={agentAudioRef} />}
          </div>
        </div>

        {/* Right: End Session */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowEndConfirm(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-white/10 text-[var(--text-secondary)] hover:bg-[var(--error)]/20 hover:text-[var(--error)] transition-all"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
            </svg>
            <span className="hidden md:inline">End Session</span>
          </button>
        </div>
      </div>

      {/* End session confirmation dialog */}
      {showEndConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setShowEndConfirm(false)}>
          <div className="glass-card !rounded-2xl p-7 max-w-sm w-full mx-4 shadow-2xl animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="w-11 h-11 rounded-xl bg-[var(--error)]/10 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-[var(--error)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
              </svg>
            </div>
            <h3 className="font-semibold text-lg mb-2">End Session?</h3>
            <p className="text-sm text-[var(--text-secondary)] mb-6 leading-relaxed">
              You've completed {Math.max(0, currentStep - 1)} of {task.steps.length} steps in {elapsed}. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowEndConfirm(false)} className="btn-secondary flex-1 !py-2.5">
                Continue
              </button>
              <button
                onClick={() => { setShowEndConfirm(false); onEndSession?.(); }}
                className="flex-1 py-2.5 bg-[var(--error)] hover:bg-[var(--error)]/80 rounded-xl text-white text-sm font-semibold transition-all"
              >
                End Session
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CallStats debug panel (Shift+D) */}
      {showStats && (
        <div className="fixed bottom-20 right-4 z-50 bg-[var(--bg-card)] rounded-xl border border-white/10 p-4 max-w-sm max-h-96 overflow-auto shadow-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Debug Stats</span>
            <button onClick={() => setShowStats(false)} className="text-xs text-[var(--text-secondary)] hover:text-white">Close</button>
          </div>
          <CallStats />
        </div>
      )}

      {/* Keyboard shortcuts help (Shift+?) */}
      {showShortcuts && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowShortcuts(false)}>
          <div className="bg-[var(--bg-card)] rounded-2xl p-6 max-w-xs w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold mb-4">Keyboard Shortcuts</h3>
            <div className="space-y-3 text-sm">
              {[
                ['M', 'Toggle microphone'],
                ['Shift + D', 'Debug stats'],
                ['Shift + ?', 'This help'],
                ['Esc', 'Close overlay'],
              ].map(([key, desc]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-[var(--text-secondary)]">{desc}</span>
                  <kbd className="bg-white/10 rounded px-2 py-0.5 text-xs font-mono">{key}</kbd>
                </div>
              ))}
            </div>
            <button
              onClick={() => setShowShortcuts(false)}
              className="mt-5 w-full py-2 bg-[var(--accent)] rounded-lg text-sm font-medium"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Renders a bare <audio> element bound to the agent's audio track. */
function AgentAudio({
  sessionId,
  userId,
  audioRef,
}: {
  sessionId: string;
  userId: string;
  audioRef: React.RefObject<HTMLAudioElement | null>;
}) {
  const call = useCall();
  const { useRemoteParticipants } = useCallStateHooks();
  const remotes = useRemoteParticipants();
  const agentParticipant = remotes.find((p) => p.userId === userId);

  useEffect(() => {
    const el = audioRef.current;
    if (!el || !call) return;

    // Try 1: Use participant's audioStream directly
    if (agentParticipant?.audioStream) {
      console.log('[AgentAudio] Binding audioStream directly');
      el.srcObject = agentParticipant.audioStream;
      el.play().catch(() => {});
      return;
    }

    // Try 2: Fall back to bindAudioElement
    console.log('[AgentAudio] Falling back to bindAudioElement', sessionId);
    const cleanup = call.bindAudioElement(el, sessionId, 'audioTrack');
    return () => { cleanup?.(); };
  }, [call, sessionId, audioRef, agentParticipant?.audioStream]);

  return <audio ref={audioRef} autoPlay playsInline data-user-id={userId} data-session-id={sessionId} />;
}
