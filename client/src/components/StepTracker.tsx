import { useEffect, useRef, useState } from 'react';

const TOKEN_SERVER = import.meta.env.VITE_TOKEN_SERVER || 'https://innocent-melbourne-forty-petroleum.trycloudflare.com';

interface Step {
  step: number;
  title: string;
  short: string;
}

interface TranslatedStep {
  step: number;
  instruction: string;
}

interface StepTrackerProps {
  steps: Step[];
  currentStep: number;
  taskId?: string;
}

export function StepTracker({ steps, currentStep, taskId }: StepTrackerProps) {
  const prevStep = useRef(currentStep);
  const [justCompleted, setJustCompleted] = useState<number | null>(null);
  const currentRef = useRef<HTMLDivElement>(null);
  const [lang, setLang] = useState<'en' | 'ja'>('en');
  const [translatedSteps, setTranslatedSteps] = useState<TranslatedStep[]>([]);
  const [translating, setTranslating] = useState(false);

  const toggleLang = async () => {
    if (lang === 'en') {
      if (translatedSteps.length === 0 && taskId) {
        setTranslating(true);
        try {
          const res = await fetch(`${TOKEN_SERVER}/translate-task/${taskId}`);
          if (res.ok) {
            const data = await res.json();
            setTranslatedSteps(data.steps || []);
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

  const getTitle = (step: Step) => {
    if (lang === 'ja') {
      const ts = translatedSteps.find((s) => s.step === step.step);
      if (ts) return ts.instruction.split('.')[0];
    }
    return step.title;
  };

  useEffect(() => {
    if (currentStep > prevStep.current) {
      setJustCompleted(prevStep.current);
      const timer = setTimeout(() => setJustCompleted(null), 600);
      prevStep.current = currentStep;
      return () => clearTimeout(timer);
    }
    prevStep.current = currentStep;
  }, [currentStep]);

  // Auto-scroll to current step
  useEffect(() => {
    currentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [currentStep]);

  const completedCount = Math.max(0, currentStep - 1);
  const progress = (completedCount / steps.length) * 100;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-[var(--border)]">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
            Progress
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleLang}
              disabled={translating}
              className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white/10 hover:bg-white/15 transition-all disabled:opacity-50"
              title={lang === 'en' ? 'Translate to Japanese' : 'Switch to English'}
            >
              {translating ? '...' : lang === 'en' ? 'JP' : 'EN'}
            </button>
            <span className="text-[11px] font-semibold text-[var(--text-tertiary)]">
              {completedCount}/{steps.length}
            </span>
          </div>
        </div>
        {/* Progress bar */}
        <div className="mt-2.5 h-1 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${progress}%`,
              background: progress === 100
                ? 'var(--success)'
                : 'linear-gradient(90deg, var(--gradient-start), var(--gradient-end))',
            }}
          />
        </div>
      </div>

      {/* Steps list */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {steps.map((s, idx) => {
          const isCompleted = s.step < currentStep;
          const isCurrent = s.step === currentStep;
          const isLast = idx === steps.length - 1;
          const wasJustCompleted = justCompleted === s.step;

          return (
            <div key={s.step} className="flex gap-3" ref={isCurrent ? currentRef : undefined}>
              {/* Vertical line + circle */}
              <div className="flex flex-col items-center">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold transition-all duration-300 ${
                    isCompleted
                      ? 'bg-[var(--success)] text-black'
                      : isCurrent
                        ? 'bg-[var(--accent)] text-white shadow-[0_0_8px_var(--accent-glow)]'
                        : 'bg-white/[0.06] text-[var(--text-tertiary)]'
                  } ${wasJustCompleted ? 'animate-scale-in' : ''}`}
                >
                  {isCompleted ? (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    s.step
                  )}
                </div>
                {/* Connecting line */}
                {!isLast && (
                  <div className={`w-px flex-1 min-h-3 my-1 transition-colors duration-300 ${
                    isCompleted ? 'bg-[var(--success)]/30' : 'bg-white/[0.04]'
                  }`} />
                )}
              </div>

              {/* Step content */}
              <div className={`pb-4 min-w-0 flex-1 transition-all duration-300 ${
                isCurrent ? '' : isCompleted ? 'opacity-50' : 'opacity-30'
              }`}>
                <p className={`text-[13px] font-medium leading-tight ${
                  isCurrent ? 'text-[var(--text-primary)]' : ''
                }`}>
                  {getTitle(s)}
                </p>
                {isCurrent ? (
                  <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                    {s.short}
                  </p>
                ) : isCompleted ? (
                  <p className="text-[11px] text-[var(--success)]/60 mt-0.5">Completed</p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-[var(--border)]">
        <p className="text-[11px] text-[var(--text-tertiary)] text-center">
          AI advances steps automatically
        </p>
        {lang === 'ja' && (
          <p className="text-[10px] text-[var(--text-tertiary)]/60 text-center mt-1">
            Translation by Shisa AI
          </p>
        )}
      </div>
    </div>
  );
}
