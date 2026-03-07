import { useEffect, useRef, useState } from 'react';
import type { TaskDetail as TaskDetailType } from '../types';
import { CvToolBar } from './CvToolBadge';

const TOKEN_SERVER = import.meta.env.VITE_TOKEN_SERVER || 'http://localhost:8080';

interface TaskDetailProps {
  task: TaskDetailType;
  onStart: () => void;
  onBack: () => void;
  loading?: boolean;
  loadingStatus?: string;
}

function CameraPreview() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let stream: MediaStream | null = null;

    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((s) => {
        stream = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          setReady(true);
        }
      })
      .catch(() => setError(true));

    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  if (error) {
    return (
      <div className="w-full aspect-video bg-[var(--bg-secondary)] rounded-2xl flex flex-col items-center justify-center border border-[var(--border)]">
        <svg className="w-10 h-10 text-[var(--text-tertiary)] mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
        </svg>
        <p className="text-sm text-[var(--text-secondary)]">Camera not available</p>
        <p className="text-xs text-[var(--text-tertiary)] mt-1">Check browser permissions</p>
      </div>
    );
  }

  return (
    <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-[var(--border)] bg-[var(--bg-secondary)]">
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="w-full h-full object-cover"
        style={{ transform: 'scaleX(-1)' }}
      />
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      {ready && (
        <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/60 backdrop-blur-sm rounded-full px-3 py-1">
          <div className="w-2 h-2 rounded-full bg-[var(--success)] animate-pulse" />
          <span className="text-[11px] font-medium">Camera ready</span>
        </div>
      )}
    </div>
  );
}

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: 'text-emerald-400',
  intermediate: 'text-amber-400',
  advanced: 'text-red-400',
};

interface TranslatedTask {
  name: string;
  description: string;
  steps: { step: number; instruction: string }[];
}

export function TaskDetail({ task, onStart, onBack, loading, loadingStatus }: TaskDetailProps) {
  const [lang, setLang] = useState<'en' | 'ja'>('en');
  const [translated, setTranslated] = useState<TranslatedTask | null>(null);
  const [translating, setTranslating] = useState(false);

  const toggleLang = async () => {
    if (lang === 'en') {
      if (!translated) {
        setTranslating(true);
        try {
          const res = await fetch(`${TOKEN_SERVER}/translate-task/${task.id}`);
          if (res.ok) {
            setTranslated(await res.json());
          }
        } catch (e) {
          console.error('Translation failed:', e);
        }
        setTranslating(false);
      }
      setLang('ja');
    } else {
      setLang('en');
    }
  };

  const displayName = lang === 'ja' && translated ? translated.name : task.name;
  const displayDesc = lang === 'ja' && translated ? translated.description : task.description;
  const getStepInstruction = (step: number) => {
    if (lang === 'ja' && translated) {
      const ts = translated.steps.find((s) => s.step === step);
      if (ts) return ts.instruction;
    }
    return task.steps.find((s) => s.step === step)?.instruction ?? '';
  };

  return (
    <div className="min-h-screen bg-grid bg-mesh">
      {/* Header */}
      <header className="border-b border-[var(--border)] bg-[var(--bg-primary)]/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              disabled={loading}
              className="flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
              </svg>
              Back to tasks
            </button>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleLang}
              disabled={translating}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/10 hover:bg-white/15 transition-all disabled:opacity-50"
              title={lang === 'en' ? 'Translate to Japanese' : 'Switch to English'}
            >
              {translating ? (
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <span className="text-sm">{lang === 'en' ? 'JP' : 'EN'}</span>
              )}
              <span className="hidden sm:inline">{lang === 'en' ? 'Japanese' : 'English'}</span>
            </button>
            <span className="text-xl font-bold tracking-tight">
              <span className="text-gradient">Guide</span>Sight
            </span>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 animate-fade-in">
          {/* Left: Camera preview (3 cols) */}
          <div className="lg:col-span-3 space-y-4">
            <CameraPreview />
            <div className="glass-card p-4 flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-[var(--accent-subtle)] flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-5 h-5 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium mb-0.5">Before you start</p>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  Position your camera so your entire workspace is visible. The AI coach will see through your camera and guide you with voice instructions. Speak naturally — no buttons needed.
                </p>
              </div>
            </div>
          </div>

          {/* Right: Task info (2 cols) */}
          <div className="lg:col-span-2 space-y-5">
            {/* Task card */}
            <div className="glass-card p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className={`text-xs font-medium capitalize ${DIFFICULTY_COLORS[task.difficulty] ?? 'text-[var(--text-secondary)]'}`}>
                  {task.difficulty}
                </span>
                <span className="text-[var(--text-tertiary)]">·</span>
                <span className="text-xs text-[var(--text-secondary)]">~{task.estimated_time}</span>
                <span className="text-[var(--text-tertiary)]">·</span>
                <span className="text-xs text-[var(--text-secondary)]">{task.step_count} steps</span>
              </div>

              <h1 className="text-2xl font-bold tracking-tight mb-3">{displayName}</h1>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-5">
                {displayDesc}
              </p>

              {task.cv_tools && task.cv_tools.length > 0 && (
                <div className="mb-5 pb-5 border-b border-[var(--border)]">
                  <h4 className="text-[11px] uppercase tracking-wider text-[var(--text-tertiary)] mb-2.5 font-semibold">
                    AI Vision Tools
                  </h4>
                  <CvToolBar toolIds={task.cv_tools} size="sm" />
                </div>
              )}

              <div className="mb-6">
                <h4 className="text-[11px] uppercase tracking-wider text-[var(--text-tertiary)] mb-2.5 font-semibold">
                  You'll need
                </h4>
                <div className="space-y-1.5">
                  {task.components.map((c, i) => (
                    <div key={i} className="flex items-center gap-2.5 text-sm text-[var(--text-secondary)]">
                      <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
                      {c}
                    </div>
                  ))}
                </div>
              </div>

              {/* Start button */}
              <button
                onClick={onStart}
                disabled={loading}
                className="w-full btn-primary !py-3.5 !text-base disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>{loadingStatus || 'Connecting...'}</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
                    </svg>
                    Start Coaching Session
                  </>
                )}
              </button>
            </div>

            {/* Steps preview */}
            <div className="glass-card p-5">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-[11px] uppercase tracking-wider text-[var(--text-tertiary)] font-semibold">
                  Steps overview
                </h4>
                {lang === 'ja' && (
                  <span className="text-[10px] text-[var(--text-tertiary)]/60">
                    Shisa AI
                  </span>
                )}
              </div>
              <div className="space-y-2.5">
                {task.steps.map((s) => (
                  <div key={s.step} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center flex-shrink-0 text-[11px] font-semibold text-[var(--text-tertiary)]">
                      {s.step}
                    </div>
                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed pt-0.5">
                      {getStepInstruction(s.step).split('.')[0]}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
