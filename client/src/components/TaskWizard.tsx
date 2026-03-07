import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useDropzone } from 'react-dropzone';
import { useHotkeys } from 'react-hotkeys-hook';
import confetti from 'canvas-confetti';
import { useSpeechToText } from '../hooks/useSpeechToText';
import { PROCESSOR_TO_TOOLS } from '../cvTools';
import type { TaskDetail } from '../types';

const TOKEN_SERVER = import.meta.env.VITE_TOKEN_SERVER || 'http://localhost:8080';

const ACCEPT = {
  'application/pdf': ['.pdf'],
  'image/*': ['.jpg', '.jpeg', '.png', '.webp'],
  'video/*': ['.mp4', '.mov', '.webm'],
  'text/plain': ['.txt'],
};

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

const DRAFT_KEY = 'guidesight-wizard-draft';

const GENERATION_STEPS = [
  { label: 'Uploading', icon: 'upload' },
  { label: 'Analyzing', icon: 'search' },
  { label: 'Generating steps', icon: 'steps' },
  { label: 'Selecting CV tools', icon: 'cv' },
] as const;

const THINKING_LINES = [
  'Reading uploaded files...',
  'Extracting key information...',
  'Identifying task components...',
  'Mapping step sequences...',
  'Analyzing difficulty level...',
  'Detecting required tools...',
  'Building visual cue descriptions...',
  'Identifying common errors...',
  'Selecting CV processors...',
  'Finalizing task structure...',
];

const TIPS = [
  'Adding images of the finished product helps AI generate better visual cues.',
  'Detailed descriptions produce more accurate step-by-step instructions.',
  'Video references help the AI understand motion and technique.',
  'The AI will automatically select the best computer vision tools for your task.',
];

const EXAMPLE_PROMPTS = [
  { icon: '⚡', label: 'LED Circuit', text: 'Build a basic LED circuit on a breadboard with a resistor, connecting a coin battery to light up an LED.', domain: 'electronics' },
  { icon: '✈', label: 'Paper Airplane', text: 'Fold a standard paper dart airplane from a single sheet of A4 paper, step by step.', domain: 'paper' },
  { icon: '🔧', label: 'Mechanical', text: 'Replace the brake pads on a car, including jacking, caliper removal, and pad installation.', domain: 'mechanical' },
  { icon: '🍳', label: 'Cooking', text: 'Make a Japanese omelette (tamagoyaki) using a rectangular pan with proper folding technique.', domain: 'cooking' },
];

const PLACEHOLDER_EXAMPLES = [
  'e.g., Build a basic LED circuit on a breadboard with a resistor...',
  'e.g., Fold a standard paper dart airplane from A4 paper...',
  'e.g., Assemble a flat-pack bookshelf with dowels and cam locks...',
  'e.g., Make a Japanese omelette with proper rolling technique...',
];

// Domain detection keywords
const DOMAIN_MAP: Record<string, { label: string; icon: string; keywords: string[] }> = {
  electronics: { label: 'Electronics', icon: '⚡', keywords: ['circuit', 'led', 'resistor', 'breadboard', 'solder', 'wire', 'battery', 'arduino', 'voltage', 'capacitor', 'transistor', 'pcb'] },
  paper: { label: 'Paper Craft', icon: '✈', keywords: ['fold', 'paper', 'origami', 'airplane', 'crease', 'sheet', 'a4'] },
  cooking: { label: 'Cooking', icon: '🍳', keywords: ['cook', 'recipe', 'bake', 'fry', 'chop', 'ingredients', 'pan', 'oven', 'stir', 'boil', 'omelette', 'knife'] },
  mechanical: { label: 'Mechanical', icon: '🔧', keywords: ['brake', 'engine', 'wrench', 'bolt', 'screw', 'assemble', 'install', 'repair', 'replace', 'tool', 'drill'] },
  medical: { label: 'Medical', icon: '🩺', keywords: ['bandage', 'wound', 'injection', 'cpr', 'vital', 'patient', 'sterile', 'suture'] },
  woodwork: { label: 'Woodworking', icon: '🪵', keywords: ['wood', 'saw', 'sand', 'plank', 'joint', 'dowel', 'shelf', 'furniture', 'cabinet'] },
};

function detectDomain(text: string, fileNames: string[]): { label: string; icon: string } | null {
  const combined = (text + ' ' + fileNames.join(' ')).toLowerCase();
  let best: { domain: string; count: number } | null = null;
  for (const [key, { keywords }] of Object.entries(DOMAIN_MAP)) {
    const count = keywords.filter((kw) => combined.includes(kw)).length;
    if (count > 0 && (!best || count > best.count)) {
      best = { domain: key, count };
    }
  }
  if (best) {
    const d = DOMAIN_MAP[best.domain];
    return { label: d.label, icon: d.icon };
  }
  return null;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileSizeColor(bytes: number) {
  if (bytes > 10 * 1024 * 1024) return 'text-[var(--warning)]';
  return 'text-[var(--text-secondary)]';
}

// Prompt quality scoring
function getPromptQuality(desc: string, fileCount: number): { score: number; label: string; color: string } {
  let score = 0;
  if (desc.length > 10) score++;
  if (desc.length > 40) score++;
  if (/\b(step|build|fold|make|assemble|connect|install|cook)\b/i.test(desc)) score++;
  if (fileCount > 0) score++;
  const labels = [
    { label: 'Add more detail', color: 'var(--text-tertiary)' },
    { label: 'Minimal', color: 'var(--warning)' },
    { label: 'Good', color: 'var(--warning)' },
    { label: 'Detailed', color: 'var(--success)' },
    { label: 'Excellent', color: 'var(--success)' },
  ];
  return { score, ...labels[score] };
}

function FileIcon({ type }: { type: string }) {
  if (type.startsWith('video/')) {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-400">
        <polygon points="23 7 16 12 23 17 23 7" />
        <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
      </svg>
    );
  }
  if (type.startsWith('image/')) {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-400">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </svg>
    );
  }
  if (type === 'application/pdf') {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-400">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    );
  }
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--text-secondary)]">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
    </svg>
  );
}

// Ambient glow colors per generation step
const GEN_GLOWS = [
  'radial-gradient(ellipse 60% 40% at 50% 50%, rgba(108, 99, 255, 0.06) 0%, transparent 70%)',
  'radial-gradient(ellipse 60% 40% at 50% 50%, rgba(168, 85, 247, 0.08) 0%, transparent 70%)',
  'radial-gradient(ellipse 60% 40% at 50% 50%, rgba(59, 130, 246, 0.08) 0%, transparent 70%)',
  'radial-gradient(ellipse 60% 40% at 50% 50%, rgba(34, 197, 94, 0.08) 0%, transparent 70%)',
];

interface Props {
  onGenerated: (task: TaskDetail, cvProcessor: string, cvReason: string) => void;
  onCancel: () => void;
}

export function TaskWizard({ onGenerated, onCancel }: Props) {
  const [files, setFiles] = useState<File[]>([]);
  const [description, setDescription] = useState('');
  const [phase, setPhase] = useState<'input' | 'generating' | 'success' | 'error'>('input');
  const [genStep, setGenStep] = useState(0);
  const [error, setError] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [tipIdx, setTipIdx] = useState(0);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [removingIdx, setRemovingIdx] = useState<number | null>(null);
  const [showTemplates, setShowTemplates] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [thinkingLines, setThinkingLines] = useState<string[]>([]);
  const [successTask, setSuccessTask] = useState<{ task: TaskDetail; cvProcessor: string; cvReason: string } | null>(null);
  const [draftBanner, setDraftBanner] = useState<{ description: string; timestamp: number } | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const speech = useSpeechToText();
  const abortRef = useRef<AbortController | null>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const generateBtnRef = useRef<HTMLButtonElement>(null);
  const thinkingRef = useRef<HTMLDivElement>(null);
  const [thumbnails, setThumbnails] = useState<Record<number, string>>({});

  // Online/offline detection
  useEffect(() => {
    const online = () => setIsOnline(true);
    const offline = () => setIsOnline(false);
    window.addEventListener('online', online);
    window.addEventListener('offline', offline);
    return () => {
      window.removeEventListener('online', online);
      window.removeEventListener('offline', offline);
    };
  }, []);

  // Clipboard paste support (Cmd+V images anywhere on page)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (!e.clipboardData) return;
      const items = Array.from(e.clipboardData.items);
      const imageItems = items.filter((item) => item.type.startsWith('image/'));
      if (imageItems.length === 0) return;
      e.preventDefault();
      const newFiles = imageItems.map((item) => item.getAsFile()).filter(Boolean) as File[];
      if (newFiles.length > 0) {
        setFiles((prev) => [...prev, ...newFiles]);
        setShowTemplates(false);
      }
    };
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, []);

  // Auto-save draft to localStorage (debounced)
  useEffect(() => {
    if (!description.trim()) return;
    const timeout = setTimeout(() => {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ description: description.trim(), timestamp: Date.now() }));
    }, 2000);
    return () => clearTimeout(timeout);
  }, [description]);

  // Check for saved draft on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (!saved) return;
      const draft = JSON.parse(saved);
      const age = Date.now() - draft.timestamp;
      if (age < 60 * 60 * 1000 && draft.description) { // Less than 1 hour old
        setDraftBanner(draft);
      } else {
        localStorage.removeItem(DRAFT_KEY);
      }
    } catch { /* ignore */ }
  }, []);

  const restoreDraft = () => {
    if (draftBanner) {
      setDescription(draftBanner.description);
      setShowTemplates(false);
      setDraftBanner(null);
    }
  };

  const discardDraft = () => {
    localStorage.removeItem(DRAFT_KEY);
    setDraftBanner(null);
  };

  // Generate image thumbnails
  useEffect(() => {
    files.forEach((f, i) => {
      if (f.type.startsWith('image/') && !thumbnails[i]) {
        const url = URL.createObjectURL(f);
        setThumbnails((prev) => ({ ...prev, [i]: url }));
      }
    });
    return () => {
      Object.values(thumbnails).forEach((url) => URL.revokeObjectURL(url));
    };
  }, [files.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const onDrop = useCallback((accepted: File[], rejected: any[]) => {
    if (rejected.length > 0) {
      const tooLarge = rejected.find((r: any) => r.errors?.some((e: any) => e.code === 'file-too-large'));
      if (tooLarge) {
        setError(`File too large (max ${formatFileSize(MAX_FILE_SIZE)})`);
        setTimeout(() => setError(''), 4000);
      }
    }
    setFiles((prev) => [...prev, ...accepted]);
    setShowTemplates(false);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPT,
    multiple: true,
    maxSize: MAX_FILE_SIZE,
  });

  const removeFile = (idx: number) => {
    setRemovingIdx(idx);
    setTimeout(() => {
      setFiles((prev) => prev.filter((_, i) => i !== idx));
      if (thumbnails[idx]) {
        URL.revokeObjectURL(thumbnails[idx]);
        setThumbnails((prev) => {
          const next = { ...prev };
          delete next[idx];
          const reindexed: Record<number, string> = {};
          Object.entries(next).forEach(([k, v]) => {
            const key = Number(k);
            reindexed[key > idx ? key - 1 : key] = v;
          });
          return reindexed;
        });
      }
      setRemovingIdx(null);
    }, 200);
  };

  // Cycle generation steps
  useEffect(() => {
    if (phase !== 'generating') return;
    const interval = setInterval(() => {
      setGenStep((i) => Math.min(i + 1, GENERATION_STEPS.length - 1));
    }, 3000);
    return () => clearInterval(interval);
  }, [phase]);

  // Elapsed timer
  useEffect(() => {
    if (phase !== 'generating') return;
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(interval);
  }, [phase]);

  // Cycle tips during generation
  useEffect(() => {
    if (phase !== 'generating') return;
    const interval = setInterval(() => {
      setTipIdx((i) => (i + 1) % TIPS.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [phase]);

  // "AI is thinking" thought stream
  useEffect(() => {
    if (phase !== 'generating') return;
    setThinkingLines([]);
    let idx = 0;
    const interval = setInterval(() => {
      if (idx < THINKING_LINES.length) {
        setThinkingLines((prev) => [...prev, THINKING_LINES[idx]]);
        idx++;
        // Auto-scroll thinking area
        if (thinkingRef.current) {
          thinkingRef.current.scrollTop = thinkingRef.current.scrollHeight;
        }
      }
    }, 2200);
    return () => clearInterval(interval);
  }, [phase]);

  // Rotate placeholder
  useEffect(() => {
    if (description) return;
    const interval = setInterval(() => {
      setPlaceholderIdx((i) => (i + 1) % PLACEHOLDER_EXAMPLES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [description]);

  // Append speech transcript
  useEffect(() => {
    if (speech.transcript) {
      setDescription((prev) => {
        const spacer = prev && !prev.endsWith(' ') && !prev.endsWith('\n') ? ' ' : '';
        return prev + spacer + speech.transcript;
      });
      speech.reset();
      setShowTemplates(false);
    }
  }, [speech.transcript, speech.reset]);

  // Focus management on phase transitions
  useEffect(() => {
    if (phase === 'generating' && statusRef.current) {
      statusRef.current.focus();
    } else if (phase === 'error' && errorRef.current) {
      errorRef.current.focus();
    }
  }, [phase]);

  const canGenerate = (files.length > 0 || description.trim().length > 0) && isOnline;

  const detectedDomain = useMemo(
    () => detectDomain(description, files.map((f) => f.name)),
    [description, files],
  );

  const promptQuality = useMemo(
    () => getPromptQuality(description.trim(), files.length),
    [description, files.length],
  );

  const dividerText = useMemo(() => {
    if (files.length > 0 && description.trim().length > 0) return 'check';
    if (files.length > 0 || description.trim().length > 0) return 'and';
    return 'or';
  }, [files.length, description]);

  const handleGenerate = async () => {
    if (!canGenerate) return;

    // Phase transition animation
    setTransitioning(true);
    await new Promise((r) => setTimeout(r, 300));
    setPhase('generating');
    setTransitioning(false);
    setGenStep(0);
    setElapsed(0);
    setError('');

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const formData = new FormData();
      files.forEach((f) => formData.append('files', f));
      if (description.trim()) {
        formData.append('description', description.trim());
      }

      const res = await fetch(`${TOKEN_SERVER}/generate-task`, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        const msg = data?.error || `Server returned ${res.status}. Is the token server running the latest code? Try restarting it.`;
        throw new Error(msg);
      }

      const data = await res.json();
      const cvTools = data.cv_tools
        ?? PROCESSOR_TO_TOOLS[data.cv_processor]
        ?? ['hand_tracking'];
      const task: TaskDetail = {
        id: data.id,
        name: data.name,
        description: data.description,
        difficulty: data.difficulty,
        estimated_time: data.estimated_time,
        components: data.components,
        steps: data.steps,
        step_count: data.steps.length,
        cv_tools: cvTools,
      };

      // Clear draft on success
      localStorage.removeItem(DRAFT_KEY);
      setRetryCount(0);

      // Show success state briefly before transitioning
      setSuccessTask({ task, cvProcessor: data.cv_processor, cvReason: data.cv_processor_reason });
      setPhase('success');

      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#6c63ff', '#a855f7', '#22c55e', '#fbbf24'],
        disableForReducedMotion: true,
      });

      setTimeout(() => onGenerated(task, data.cv_processor, data.cv_processor_reason), 1800);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setPhase('input');
        return;
      }
      setError(err.message || 'Failed to generate task');
      setRetryCount((c) => c + 1);
      setPhase('error');
    }
  };

  const handleRetry = async () => {
    const delay = Math.min(1000 * Math.pow(2, retryCount - 1), 7000);
    setError('');
    await new Promise((r) => setTimeout(r, delay));
    handleGenerate();
  };

  const handleCancel = () => {
    abortRef.current?.abort();
    setPhase('input');
  };

  const handleTemplateClick = (text: string) => {
    setDescription(text);
    setShowTemplates(false);
  };

  // Cmd+Enter to generate
  useHotkeys('mod+enter', () => {
    if (canGenerate && phase === 'input') handleGenerate();
  }, { enableOnFormTags: ['TEXTAREA'] }, [canGenerate, phase]);

  const formatElapsed = useMemo(() => {
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, [elapsed]);

  // --- Phase: Success (brief morph before transition) ---
  if (phase === 'success' && successTask) {
    const { task } = successTask;
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-semibold text-lg">AI Task Generator</h2>
        </div>

        {/* Success header */}
        <div className="text-center py-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[var(--success)]/20 mb-3 animate-scale-in">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <p className="text-[var(--text-primary)] font-semibold text-lg">Task Created</p>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            {task.step_count} steps · {task.difficulty} · {task.estimated_time}
          </p>
        </div>

        {/* Task preview card */}
        <div className="glass-card p-5 border-[var(--success)]/20" style={{ boxShadow: '0 0 30px rgba(34, 197, 94, 0.1)' }}>
          <h3 className="font-semibold text-[var(--text-primary)] mb-1 animate-fade-in" style={{ animationDelay: '200ms' }}>
            {task.name}
          </h3>
          <p className="text-sm text-[var(--text-secondary)] mb-3 animate-fade-in" style={{ animationDelay: '400ms' }}>
            {task.description}
          </p>
          <div className="space-y-2 stagger-children">
            {task.steps.slice(0, 3).map((step, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <span className="w-5 h-5 rounded-full bg-[var(--accent)]/15 text-[var(--accent)] flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                  {step.step}
                </span>
                <span className="text-[var(--text-secondary)] line-clamp-1">{step.instruction}</span>
              </div>
            ))}
            {task.steps.length > 3 && (
              <p className="text-xs text-[var(--text-tertiary)] ml-7">
                +{task.steps.length - 3} more steps...
              </p>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-[var(--text-tertiary)] animate-fade-in" style={{ animationDelay: '800ms' }}>
          Loading task details...
        </p>
      </div>
    );
  }

  // --- Phase: Generating ---
  if (phase === 'generating') {
    return (
      <div className="space-y-6 animate-fade-in" style={{ background: GEN_GLOWS[genStep], transition: 'background 1s ease' }}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-semibold text-lg">AI Task Generator</h2>
          <button
            onClick={handleCancel}
            className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            Cancel
          </button>
        </div>

        {/* Stepped progress rail */}
        <div className="flex items-center justify-between gap-2 px-2">
          {GENERATION_STEPS.map((step, i) => (
            <div key={step.label} className="flex items-center gap-2 flex-1">
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all duration-500
                ${i < genStep
                  ? 'bg-[var(--success)] text-white'
                  : i === genStep
                    ? 'bg-[var(--accent)] text-white animate-pulse-glow'
                    : 'bg-[var(--bg-card)] text-[var(--text-tertiary)]'
                }
              `}>
                {i < genStep ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <span>{i + 1}</span>
                )}
              </div>
              <span className={`text-xs hidden sm:block transition-colors ${
                i <= genStep ? 'text-[var(--text-primary)]' : 'text-[var(--text-tertiary)]'
              }`}>
                {step.label}
              </span>
              {i < GENERATION_STEPS.length - 1 && (
                <div className="flex-1 h-px bg-[var(--border)] relative ml-2">
                  <div
                    className="absolute inset-y-0 left-0 bg-[var(--accent)] transition-all duration-700"
                    style={{ width: i < genStep ? '100%' : '0%' }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Status area */}
        <div
          ref={statusRef}
          tabIndex={-1}
          role="status"
          aria-live="polite"
          className="text-center py-6 outline-none"
        >
          <div className="inline-block w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-[var(--text-primary)] font-medium">
            {GENERATION_STEPS[genStep].label}...
          </p>
          <p className="text-sm text-[var(--text-secondary)] mt-2 tabular-nums">
            Elapsed: {formatElapsed} <span className="text-[var(--text-tertiary)]">· Usually 10-30s</span>
          </p>
        </div>

        {/* AI thinking stream */}
        <div
          ref={thinkingRef}
          className="mx-4 rounded-lg bg-[#0c0c0e] border border-[var(--border)] overflow-hidden"
        >
          <div className="flex items-center gap-1.5 px-3 py-2 border-b border-[var(--border)] bg-white/[0.02]">
            <div className="w-2 h-2 rounded-full bg-[var(--error)]/60" />
            <div className="w-2 h-2 rounded-full bg-[var(--warning)]/60" />
            <div className="w-2 h-2 rounded-full bg-[var(--success)]/60" />
            <span className="text-[10px] text-[var(--text-tertiary)] ml-2 font-mono">ai-reasoning</span>
          </div>
          <div className="p-3 max-h-32 overflow-y-auto font-mono text-xs space-y-1">
            {thinkingLines.map((line, i) => (
              <div key={i} className="flex items-center gap-2 animate-fade-in" style={{ animationDelay: '0ms' }}>
                <span className="text-[var(--success)]">→</span>
                <span className={i === thinkingLines.length - 1 ? 'text-[var(--text-secondary)]' : 'text-[var(--text-tertiary)]'}>
                  {line}
                </span>
                {i === thinkingLines.length - 1 && (
                  <span className="inline-block w-1.5 h-3.5 bg-[var(--accent)] animate-pulse ml-0.5" />
                )}
              </div>
            ))}
            {thinkingLines.length === 0 && (
              <div className="flex items-center gap-2">
                <span className="text-[var(--success)]">→</span>
                <span className="text-[var(--text-tertiary)]">Initializing...</span>
                <span className="inline-block w-1.5 h-3.5 bg-[var(--accent)] animate-pulse ml-0.5" />
              </div>
            )}
          </div>
        </div>

        {/* Tip rotation */}
        <div className="text-center px-8">
          <p className="text-xs text-[var(--text-tertiary)] animate-fade-in" key={tipIdx}>
            {TIPS[tipIdx]}
          </p>
        </div>

        {/* Skeleton preview */}
        <div className="space-y-4 opacity-20">
          <div className="grid grid-cols-2 gap-4">
            <div className="h-16 rounded-lg" style={{
              background: 'linear-gradient(90deg, var(--bg-card) 25%, var(--bg-card-hover) 50%, var(--bg-card) 75%)',
              backgroundSize: '200% 100%',
              animation: 'shimmer 1.5s ease-in-out infinite',
            }} />
            <div className="h-16 rounded-lg" style={{
              background: 'linear-gradient(90deg, var(--bg-card) 25%, var(--bg-card-hover) 50%, var(--bg-card) 75%)',
              backgroundSize: '200% 100%',
              animation: 'shimmer 1.5s ease-in-out infinite',
              animationDelay: '200ms',
            }} />
          </div>
          {genStep >= 2 && (
            <div className="space-y-3 stagger-children">
              <div className="h-20 bg-[var(--bg-card)] rounded-lg" />
              <div className="h-20 bg-[var(--bg-card)] rounded-lg" />
              <div className="h-20 bg-[var(--bg-card)] rounded-lg" />
            </div>
          )}
        </div>

        {/* Powered by badge */}
        <div className="flex justify-center pt-2">
          <span className="text-[10px] text-[var(--text-tertiary)] flex items-center gap-1.5">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-[var(--text-tertiary)]">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="currentColor" />
            </svg>
            Powered by Gemini 2.5 Flash
          </span>
        </div>
      </div>
    );
  }

  // --- Phase: Input (or Error) ---
  return (
    <div className={`space-y-6 transition-all duration-300 ${transitioning ? 'opacity-0 -translate-y-4' : 'opacity-100 translate-y-0'}`}>
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="font-semibold text-lg">AI Task Generator</h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Upload references, describe the task, or both — AI generates the full training task.
          </p>
        </div>
        <button
          onClick={onCancel}
          className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          Cancel
        </button>
      </div>

      {/* Offline banner */}
      {!isOnline && (
        <div className="flex items-center gap-2 bg-[var(--warning)]/15 border border-[var(--warning)]/30 text-[var(--warning)] rounded-lg px-4 py-2.5 text-sm animate-fade-in">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="1" y1="1" x2="23" y2="23" />
            <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
            <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
            <path d="M10.71 5.05A16 16 0 0 1 22.56 9" />
            <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
            <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
            <line x1="12" y1="20" x2="12.01" y2="20" />
          </svg>
          No internet connection — your draft is saved locally
        </div>
      )}

      {/* Draft restore banner */}
      {draftBanner && !description && (
        <div className="flex items-center justify-between glass-card px-4 py-3 animate-fade-in">
          <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            Draft from {new Date(draftBanner.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={restoreDraft}
              className="text-xs px-3 py-1 rounded-md bg-[var(--accent)] text-white font-medium hover:bg-[var(--accent-hover)] transition-colors"
            >
              Restore
            </button>
            <button
              onClick={discardDraft}
              className="text-xs px-3 py-1 rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              Discard
            </button>
          </div>
        </div>
      )}

      {/* Error banner with retry */}
      {error && (
        <div
          ref={errorRef}
          tabIndex={-1}
          role="alert"
          aria-live="assertive"
          className="bg-[var(--error)]/15 border border-[var(--error)]/30 text-[var(--error)] rounded-lg px-4 py-3 text-sm outline-none"
          style={{ animation: 'shake 0.3s ease-in-out' }}
        >
          <div className="flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={handleRetry}
              className="ml-3 px-3 py-1 rounded-md bg-[var(--error)]/20 text-[var(--error)] text-xs font-medium hover:bg-[var(--error)]/30 transition-colors shrink-0"
            >
              Retry
            </button>
          </div>
          {retryCount >= 2 && (
            <p className="text-xs mt-2 text-[var(--error)]/70">
              Tip: Try shortening your description or removing large files.
            </p>
          )}
        </div>
      )}

      {/* Template cards (shown when form is empty) */}
      {showTemplates && !files.length && !description && (
        <div className="animate-fade-in">
          <span className="text-xs text-[var(--text-secondary)] uppercase tracking-wider font-semibold mb-3 block">
            Quick Start Templates
          </span>
          <div className="grid grid-cols-2 gap-3">
            {EXAMPLE_PROMPTS.map((ex) => (
              <button
                key={ex.label}
                onClick={() => handleTemplateClick(ex.text)}
                className="glass-card p-4 text-left group cursor-pointer"
              >
                <div className="text-2xl mb-2">{ex.icon}</div>
                <p className="text-sm font-medium text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
                  {ex.label}
                </p>
                <p className="text-xs text-[var(--text-tertiary)] mt-1 line-clamp-2">
                  {ex.text}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Section 1: File upload */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-full bg-[var(--accent)]/15 text-[var(--accent)] flex items-center justify-center text-xs font-bold">
            1
          </div>
          <span className="text-xs text-[var(--text-secondary)] uppercase tracking-wider font-semibold">
            Reference Materials
          </span>
          <span className="text-xs text-[var(--text-tertiary)]">(optional)</span>
        </div>
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
            isDragActive
              ? 'border-[var(--accent)] bg-[var(--accent)]/10 shadow-[0_0_30px_var(--accent-glow)]'
              : 'border-[var(--border)] hover:border-[var(--accent)]/40 bg-grid'
          }`}
        >
          <input {...getInputProps()} aria-label="Upload reference files" />
          <svg
            width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
            className={`mx-auto mb-2 transition-transform ${isDragActive ? 'text-[var(--accent)] scale-110' : 'text-[var(--text-tertiary)]'}`}
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <p className="text-sm text-[var(--text-secondary)]">
            {isDragActive
              ? 'Drop files here...'
              : 'Drag & drop files, or click to browse'}
          </p>
          <p className="text-xs text-[var(--text-tertiary)] mt-1">
            PDF, images, video, or text · Max {formatFileSize(MAX_FILE_SIZE)} · <span className="text-[var(--accent)]">Cmd+V</span> to paste
          </p>
        </div>

        {files.length > 0 && (
          <div className="mt-3 space-y-2">
            {files.map((f, i) => (
              <div
                key={`${f.name}-${i}`}
                className={`flex items-center gap-3 bg-[var(--bg-secondary)] rounded-lg px-3 py-2 transition-all duration-200 group ${
                  removingIdx === i ? 'opacity-0 h-0 py-0 overflow-hidden' : 'animate-scale-in'
                }`}
              >
                <span className="w-8 h-8 rounded-lg bg-[var(--bg-card)] flex items-center justify-center overflow-hidden shrink-0">
                  {thumbnails[i] ? (
                    <img src={thumbnails[i]} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <FileIcon type={f.type} />
                  )}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{f.name}</p>
                  <p className={`text-xs ${fileSizeColor(f.size)}`}>{formatFileSize(f.size)}</p>
                </div>
                <button
                  onClick={() => removeFile(i)}
                  aria-label={`Remove file ${f.name}`}
                  className="w-6 h-6 rounded flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--error)] hover:bg-[var(--error)]/10 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Smart divider */}
      <div className="flex items-center gap-4 px-2">
        <div className="flex-1 h-px bg-[var(--border)]" />
        {dividerText === 'check' ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5" className="animate-scale-in">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          <span className={`text-xs uppercase tracking-widest transition-colors ${
            dividerText === 'and' ? 'text-[var(--accent)]' : 'text-[var(--text-tertiary)]'
          }`}>
            {dividerText}
          </span>
        )}
        <div className="flex-1 h-px bg-[var(--border)]" />
      </div>

      {/* Section 2: Description */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-full bg-[var(--accent)]/15 text-[var(--accent)] flex items-center justify-center text-xs font-bold">
            2
          </div>
          <span className="text-xs text-[var(--text-secondary)] uppercase tracking-wider font-semibold">
            Task Description
          </span>
          <span className="text-xs text-[var(--text-tertiary)]">(optional)</span>
        </div>
        <div className="relative">
          <textarea
            value={description + (speech.interimTranscript ? ` ${speech.interimTranscript}` : '')}
            onChange={(e) => {
              setDescription(e.target.value);
              if (e.target.value) setShowTemplates(false);
            }}
            rows={4}
            placeholder={PLACEHOLDER_EXAMPLES[placeholderIdx]}
            className="w-full px-3 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg text-sm pr-12 focus:border-[var(--accent)]/50 transition-colors resize-none"
          />
          {speech.isSupported && (
            <button
              onClick={speech.isListening ? speech.stop : speech.start}
              aria-label={speech.isListening ? 'Stop voice input' : 'Start voice input'}
              className={`absolute right-2 top-2 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                speech.isListening
                  ? 'bg-[var(--error)] text-white breathe-ring'
                  : 'bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--accent)]'
              }`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5z" />
                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
              </svg>
            </button>
          )}
        </div>

        {/* Prompt quality meter */}
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-2">
            {speech.isListening ? (
              <p className="text-xs text-[var(--accent)] animate-pulse">Listening...</p>
            ) : (
              <div className="flex items-center gap-1.5">
                <div className="flex gap-0.5">
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-1.5 w-5 rounded-full transition-all duration-300"
                      style={{
                        backgroundColor: i < promptQuality.score
                          ? promptQuality.color
                          : 'var(--bg-card)',
                      }}
                    />
                  ))}
                </div>
                <span className="text-[10px] transition-colors" style={{ color: promptQuality.color }}>
                  {(description.trim() || files.length > 0) ? promptQuality.label : ''}
                </span>
              </div>
            )}
          </div>
          {detectedDomain && (
            <span className="text-[10px] px-2 py-0.5 rounded-full border border-[var(--accent)]/30 text-[var(--accent)] animate-scale-in flex items-center gap-1">
              {detectedDomain.icon} {detectedDomain.label} detected
            </span>
          )}
        </div>

        {/* Example prompt chips */}
        {!description && (
          <div className="flex flex-wrap gap-2 mt-3">
            <span className="text-xs text-[var(--text-tertiary)] self-center mr-1">Try:</span>
            {EXAMPLE_PROMPTS.slice(0, 3).map((ex) => (
              <button
                key={ex.label}
                onClick={() => handleTemplateClick(ex.text)}
                className="text-xs px-2.5 py-1 rounded-full border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent)]/50 hover:text-[var(--accent)] transition-colors"
              >
                {ex.icon} {ex.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Generate button area */}
      <div className="flex items-center justify-between pt-2">
        {/* Powered by badge */}
        <span className="text-[10px] text-[var(--text-tertiary)] flex items-center gap-1.5">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className="text-[var(--text-tertiary)]">
            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
          </svg>
          Powered by Gemini
        </span>
        <div className="flex items-center gap-3">
          <span className="kbd hidden sm:inline-flex">⌘ Enter</span>
          <button
            ref={generateBtnRef}
            onClick={handleGenerate}
            disabled={!canGenerate}
            className={`px-6 py-3 rounded-xl text-white font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
              canGenerate
                ? 'bg-[var(--accent)] hover:bg-[var(--accent-hover)] hover:-translate-y-0.5 shadow-[0_0_20px_var(--accent-glow)] hover:shadow-[0_0_30px_var(--accent-glow),0_4px_12px_rgba(0,0,0,0.3)]'
                : 'bg-[var(--accent)]'
            }`}
          >
            Generate Task with AI
          </button>
        </div>
      </div>
    </div>
  );
}
