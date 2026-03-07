import { useState, useEffect, useRef, useCallback } from 'react';
import { TaskWizard } from './TaskWizard';
import { TaskEditChat } from './TaskEditChat';
import { CvToolPicker, CvToolBar } from './CvToolBadge';
import { PROCESSOR_TO_TOOLS as _PROCESSOR_TO_TOOLS } from '../cvTools';
void _PROCESSOR_TO_TOOLS;
import type { TaskSummary, TaskDetail, TaskStep } from '../types';

const TOKEN_SERVER = import.meta.env.VITE_TOKEN_SERVER || 'http://localhost:8080';

const DIFFICULTY_CONFIG: Record<string, { stripe: string; bg: string; text: string }> = {
  beginner: { stripe: 'bg-emerald-500', bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
  intermediate: { stripe: 'bg-amber-500', bg: 'bg-amber-500/10', text: 'text-amber-400' },
  advanced: { stripe: 'bg-red-500', bg: 'bg-red-500/10', text: 'text-red-400' },
};

const TOAST_DURATION = 3000;

// --- Animated number counter ---
function AnimatedStat({ value, className }: { value: number; className?: string }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const animated = useRef(false);

  useEffect(() => {
    if (animated.current || value === 0) { setDisplay(value); return; }
    animated.current = true;
    let start: number;
    const duration = 600;
    const step = (ts: number) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.floor(eased * value));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [value]);

  return <span ref={ref} className={className}>{display}</span>;
}

// --- Toast system with progress bar ---
interface Toast { id: number; message: string; type: 'success' | 'error'; createdAt: number }
let toastId = 0;

function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
      {toasts.map((t, i) => (
        <div
          key={t.id}
          className="animate-fade-in"
          style={{ transform: i > 0 ? `scale(${1 - i * 0.02}) translateY(${i * 4}px)` : undefined }}
        >
          <div
            className={`glass-card !rounded-xl px-4 py-3 min-w-[280px] shadow-xl cursor-pointer overflow-hidden ${
              t.type === 'error' ? 'border-[var(--error)]/30' : 'border-[var(--success)]/30'
            }`}
            onClick={() => onDismiss(t.id)}
          >
            <div className="flex items-center gap-3">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                t.type === 'error' ? 'bg-[var(--error)]/20' : 'bg-[var(--success)]/20'
              }`}>
                {t.type === 'error' ? (
                  <svg className="w-3 h-3 text-[var(--error)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                ) : (
                  <svg className="w-3 h-3 text-[var(--success)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                )}
              </div>
              <span className="text-sm">{t.message}</span>
            </div>
            {/* Progress bar */}
            <div className="mt-2 h-[2px] bg-white/5 rounded-full overflow-hidden -mx-1">
              <div
                className={`h-full rounded-full ${t.type === 'error' ? 'bg-[var(--error)]' : 'bg-[var(--success)]'}`}
                style={{
                  animation: `toast-shrink ${TOAST_DURATION}ms linear forwards`,
                }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// --- Command Palette ---
function CommandPalette({
  tasks,
  isOpen,
  onClose,
  onEditTask,
  onDeleteTask: _onDeleteTask,
  onCreateTask,
  onNavigate,
}: {
  tasks: TaskSummary[];
  isOpen: boolean;
  onClose: () => void;
  onEditTask: (id: string) => void;
  onDeleteTask: (t: TaskSummary) => void;
  onCreateTask: () => void;
  onNavigate: (hash: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setActiveIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  type CmdItem = { label: string; section: string; icon: string; action: () => void; shortcut?: string };
  const items: CmdItem[] = [];

  // Actions
  items.push({ label: 'Create New Task', section: 'Actions', icon: '➕', action: () => { onClose(); onCreateTask(); }, shortcut: 'N' });
  items.push({ label: 'Go to Analytics', section: 'Navigation', icon: '📊', action: () => { onClose(); onNavigate('#analytics'); } });
  items.push({ label: 'Go to Home', section: 'Navigation', icon: '🏠', action: () => { onClose(); onNavigate('#'); } });

  // Tasks
  tasks.forEach((t) => {
    items.push({ label: `Edit: ${t.name}`, section: 'Tasks', icon: '📝', action: () => { onClose(); onEditTask(t.id); } });
  });

  const q = query.toLowerCase();
  const filtered = q ? items.filter((item) => item.label.toLowerCase().includes(q)) : items;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, filtered.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter' && filtered[activeIdx]) { filtered[activeIdx].action(); }
    else if (e.key === 'Escape') { onClose(); }
  };

  // Group items by section
  const sections: { name: string; items: (CmdItem & { globalIdx: number })[] }[] = [];
  let currentSection = '';
  filtered.forEach((item, idx) => {
    if (item.section !== currentSection) {
      currentSection = item.section;
      sections.push({ name: currentSection, items: [] });
    }
    sections[sections.length - 1].items.push({ ...item, globalIdx: idx });
  });

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center pt-[20vh] bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-[520px] mx-4 glass-card !rounded-2xl shadow-2xl overflow-hidden animate-scale-in" onClick={(e) => e.stopPropagation()}>
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)]">
          <svg className="w-5 h-5 text-[var(--text-tertiary)] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActiveIdx(0); }}
            onKeyDown={handleKeyDown}
            placeholder="Search tasks, actions..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--text-tertiary)]"
          />
          <kbd className="kbd">Esc</kbd>
        </div>

        {/* Results */}
        <div className="max-h-[320px] overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-[var(--text-tertiary)]">No results found</div>
          ) : (
            sections.map((section) => (
              <div key={section.name}>
                <p className="px-4 py-1.5 text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] font-semibold">{section.name}</p>
                {section.items.map((item) => (
                  <button
                    key={item.label}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors ${
                      item.globalIdx === activeIdx ? 'bg-[var(--accent)]/10 text-[var(--accent)]' : 'text-[var(--text-secondary)] hover:bg-white/[0.03]'
                    }`}
                    onClick={item.action}
                    onMouseEnter={() => setActiveIdx(item.globalIdx)}
                  >
                    <span className="text-base">{item.icon}</span>
                    <span className="flex-1">{item.label}</span>
                    {item.shortcut && <kbd className="kbd">{item.shortcut}</kbd>}
                  </button>
                ))}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 px-4 py-2.5 border-t border-[var(--border)] text-[10px] text-[var(--text-tertiary)]">
          <span className="flex items-center gap-1"><kbd className="kbd">↑↓</kbd> Navigate</span>
          <span className="flex items-center gap-1"><kbd className="kbd">↵</kbd> Select</span>
          <span className="flex items-center gap-1"><kbd className="kbd">Esc</kbd> Close</span>
        </div>
      </div>
    </div>
  );
}

// --- Three-dot overflow menu ---
function OverflowMenu({
  task,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  task: TaskSummary;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" /></svg>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-44 glass-card !rounded-xl shadow-2xl py-1 z-50 animate-scale-in origin-top-right" style={{ animationDuration: '100ms' }}>
          <button onClick={(e) => { e.stopPropagation(); setOpen(false); onEdit(); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-white/5 hover:text-[var(--text-primary)] transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" /></svg>
            Edit
          </button>
          <button onClick={(e) => { e.stopPropagation(); setOpen(false); onDuplicate(); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-white/5 hover:text-[var(--text-primary)] transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75" /></svg>
            Duplicate
          </button>
          <button onClick={(e) => { e.stopPropagation(); setOpen(false); navigator.clipboard.writeText(task.id); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-white/5 hover:text-[var(--text-primary)] transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 7.5V6.108c0-1.135.845-2.098 1.976-2.192.373-.03.748-.057 1.123-.08M15.75 18H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08M15.75 18.75v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5A3.375 3.375 0 0 0 6.375 7.5H5.25m11.9-3.664A2.251 2.251 0 0 0 15 2.25h-1.5a2.251 2.251 0 0 0-2.15 1.586m5.8 0c.065.21.1.433.1.664v.75h-6V4.5c0-.231.035-.454.1-.664M6.75 7.5H4.875c-.621 0-1.125.504-1.125 1.125v12c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V16.5a9 9 0 0 0-9-9Z" /></svg>
            Copy ID
          </button>
          <div className="my-1 border-t border-[var(--border)]" />
          <button onClick={(e) => { e.stopPropagation(); setOpen(false); onDelete(); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-[var(--error)] hover:bg-[var(--error)]/10 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

// --- Step completeness ring ---
function StepRing({ step }: { step: TaskStep }) {
  const filled = [step.instruction, step.visual_cue, step.common_errors.some((e) => e.trim())].filter(Boolean).length;
  const pct = (filled / 3) * 100;
  const r = 6;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <svg className="w-4 h-4 -rotate-90 flex-shrink-0" viewBox="0 0 16 16">
      <circle cx="8" cy="8" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2" />
      <circle cx="8" cy="8" r={r} fill="none" stroke={pct === 100 ? 'var(--success)' : 'var(--accent)'} strokeWidth="2" strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-500" />
    </svg>
  );
}

// --- Delete confirmation modal ---
function DeleteModal({ taskName, onConfirm, onCancel }: { taskName: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onCancel}>
      <div className="glass-card !rounded-2xl p-7 max-w-sm w-full mx-4 shadow-2xl animate-scale-in" onClick={(e) => e.stopPropagation()}>
        <div className="w-11 h-11 rounded-xl bg-[var(--error)]/10 flex items-center justify-center mb-4">
          <svg className="w-6 h-6 text-[var(--error)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
          </svg>
        </div>
        <h3 className="font-semibold text-lg mb-2">Delete Task?</h3>
        <p className="text-sm text-[var(--text-secondary)] mb-6 leading-relaxed">
          Are you sure you want to delete <span className="font-medium text-[var(--text-primary)]">"{taskName}"</span>? This action cannot be undone.
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="btn-secondary flex-1 !py-2.5">Cancel</button>
          <button onClick={onConfirm} className="flex-1 py-2.5 bg-[var(--error)] hover:bg-[var(--error)]/80 rounded-xl text-white text-sm font-semibold transition-all">
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function emptyStep(n: number): TaskStep {
  return { step: n, instruction: '', visual_cue: '', common_errors: [''] };
}

export function AdminDashboard() {
  const [tasks, setTasks] = useState<TaskSummary[]>([]);
  const [editing, setEditing] = useState<TaskDetail | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [componentsText, setComponentsText] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showWizard, setShowWizard] = useState(false);
  const [cvProcessorInfo, setCvProcessorInfo] = useState<{ processor: string; reason: string } | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<TaskSummary | null>(null);
  const [collapsedSteps, setCollapsedSteps] = useState<Set<number>>(new Set());
  const [isDirty, setIsDirty] = useState(false);
  const initialEditing = useRef<string>('');
  const [cmdPaletteOpen, setCmdPaletteOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all');

  const addToast = useCallback((message: string, type: 'success' | 'error') => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type, createdAt: Date.now() }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), TOAST_DURATION);
  }, []);
  const dismissToast = (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id));

  const fetchTasks = async () => {
    const res = await fetch(`${TOKEN_SERVER}/tasks`);
    setTasks(await res.json());
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      const inInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

      // Cmd+K: Command palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCmdPaletteOpen((v) => !v);
        return;
      }

      // Cmd+S: Save when editing
      if ((e.metaKey || e.ctrlKey) && e.key === 's' && editing) {
        e.preventDefault();
        handleSave();
        return;
      }

      // Escape: close modals or go back from edit
      if (e.key === 'Escape') {
        if (cmdPaletteOpen) { setCmdPaletteOpen(false); return; }
        if (deleteTarget) { setDeleteTarget(null); return; }
        if (editing && !inInput) { setEditing(null); setCvProcessorInfo(null); setIsDirty(false); return; }
      }

      // N: new task (when not in input and not editing)
      if (e.key === 'n' && !inInput && !editing && !showWizard) {
        e.preventDefault();
        handleNew();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [editing, cmdPaletteOpen, deleteTarget, showWizard]);

  const handleEdit = async (taskId: string) => {
    const res = await fetch(`${TOKEN_SERVER}/tasks/${taskId}`);
    const task: TaskDetail = await res.json();
    setEditing(task);
    setComponentsText(task.components.join('\n'));
    setIsNew(false);
    setError(null);
    setIsDirty(false);
    setCollapsedSteps(new Set(task.steps.map((_, i) => i)));
    initialEditing.current = JSON.stringify(task);
  };

  const handleNew = () => {
    setShowWizard(true);
    setCvProcessorInfo(null);
    setError(null);
  };

  const handleWizardGenerated = (task: TaskDetail, cvProcessor: string, cvReason: string) => {
    setEditing({ ...task, cv_processor: cvProcessor } as any);
    setComponentsText(task.components.join('\n'));
    setIsNew(true);
    setShowWizard(false);
    setCvProcessorInfo({ processor: cvProcessor, reason: cvReason });
    setError(null);
    setIsDirty(true);
    setCollapsedSteps(new Set());
  };

  const handleDelete = async (taskId: string) => {
    await fetch(`${TOKEN_SERVER}/tasks/${taskId}`, { method: 'DELETE' });
    await fetchTasks();
    if (editing?.id === taskId) setEditing(null);
    setDeleteTarget(null);
    addToast('Task deleted', 'success');
  };

  const handleDuplicate = async (taskId: string) => {
    const res = await fetch(`${TOKEN_SERVER}/tasks/${taskId}`);
    const task: TaskDetail = await res.json();
    const newId = `${task.id}_copy`;
    const newTask = { ...task, id: newId, name: `${task.name} (Copy)` };
    delete (newTask as any).step_count;
    setEditing(newTask);
    setComponentsText(newTask.components.join('\n'));
    setIsNew(true);
    setError(null);
    setCvProcessorInfo(null);
    setIsDirty(true);
    setCollapsedSteps(new Set());
  };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    setError(null);

    const task = {
      ...editing,
      components: componentsText.split('\n').map((s) => s.trim()).filter(Boolean),
      steps: editing.steps.map((s, i) => ({
        ...s,
        step: i + 1,
        common_errors: s.common_errors.filter((e) => e.trim()),
      })),
    };
    // Remove step_count from payload (server derives it)
    const { step_count: _, ...payload } = task;

    try {
      const method = isNew ? 'POST' : 'PUT';
      const url = isNew ? `${TOKEN_SERVER}/tasks` : `${TOKEN_SERVER}/tasks/${task.id}`;
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save');
      }
      await fetchTasks();
      setEditing(null);
      setCvProcessorInfo(null);
      setIsDirty(false);
      addToast(isNew ? 'Task created successfully' : 'Task updated successfully', 'success');
    } catch (err: any) {
      setError(err.message);
      addToast(err.message || 'Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleChatUpdate = (updated: TaskDetail) => {
    setEditing(updated);
    setComponentsText(updated.components.join('\n'));
  };

  const updateField = (field: keyof TaskDetail, value: any) => {
    if (!editing) return;
    setEditing({ ...editing, [field]: value });
    setIsDirty(true);
  };

  const updateStep = (idx: number, field: keyof TaskStep, value: any) => {
    if (!editing) return;
    const steps = [...editing.steps];
    steps[idx] = { ...steps[idx], [field]: value };
    setEditing({ ...editing, steps });
    setIsDirty(true);
  };

  const toggleStepCollapse = (idx: number) => {
    setCollapsedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  };

  const moveStep = (idx: number, dir: -1 | 1) => {
    if (!editing) return;
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= editing.steps.length) return;
    const steps = [...editing.steps];
    [steps[idx], steps[newIdx]] = [steps[newIdx], steps[idx]];
    setEditing({ ...editing, steps });
    setIsDirty(true);
  };

  const addStep = () => {
    if (!editing) return;
    const newIdx = editing.steps.length;
    setEditing({
      ...editing,
      steps: [...editing.steps, emptyStep(editing.steps.length + 1)],
    });
    setCollapsedSteps((prev) => { const next = new Set(prev); next.delete(newIdx); return next; });
    setIsDirty(true);
  };

  const removeStep = (idx: number) => {
    if (!editing) return;
    const steps = editing.steps.filter((_, i) => i !== idx);
    setEditing({ ...editing, steps });
    setIsDirty(true);
  };

  const updateCommonError = (stepIdx: number, errIdx: number, value: string) => {
    if (!editing) return;
    const steps = [...editing.steps];
    const errors = [...steps[stepIdx].common_errors];
    errors[errIdx] = value;
    steps[stepIdx] = { ...steps[stepIdx], common_errors: errors };
    setEditing({ ...editing, steps });
  };

  const addCommonError = (stepIdx: number) => {
    if (!editing) return;
    const steps = [...editing.steps];
    steps[stepIdx] = {
      ...steps[stepIdx],
      common_errors: [...steps[stepIdx].common_errors, ''],
    };
    setEditing({ ...editing, steps });
  };

  const removeCommonError = (stepIdx: number, errIdx: number) => {
    if (!editing) return;
    const steps = [...editing.steps];
    steps[stepIdx] = {
      ...steps[stepIdx],
      common_errors: steps[stepIdx].common_errors.filter((_, i) => i !== errIdx),
    };
    setEditing({ ...editing, steps });
  };

  // The edit form JSX, extracted so it can be placed in the two-column layout
  const editFormContent = editing ? (
    <div className="animate-fade-in pb-24">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setEditing(null); setCvProcessorInfo(null); setIsDirty(false); }}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>
          </button>
          <div>
            <h2 className="font-semibold text-lg leading-tight">
              {isNew ? 'Create Task' : `Edit: ${editing.name}`}
            </h2>
            {isDirty && <p className="text-[11px] text-[var(--warning)]">Unsaved changes</p>}
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-[var(--error)]/10 border border-[var(--error)]/20 text-[var(--error)] rounded-xl px-4 py-3 mb-5 text-sm flex items-center gap-3">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" /></svg>
          {error}
        </div>
      )}

      {cvProcessorInfo && (
        <div className="bg-[var(--success)]/10 border border-[var(--success)]/30 rounded-xl px-4 py-3 mb-5">
          <p className="text-sm font-medium text-[var(--success)]">
            Task generated successfully. Review and edit below.
          </p>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            <span className="font-medium text-[var(--text-primary)]">
              CV Processor: {cvProcessorInfo.processor.replace('_', ' ')}
            </span>
            {' '}&mdash; {cvProcessorInfo.reason}
          </p>
        </div>
      )}

      {/* --- Section: Basic Info --- */}
      <div className="mb-8">
        <h3 className="text-[11px] uppercase tracking-wider text-[var(--text-tertiary)] font-semibold mb-4 flex items-center gap-2">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" /></svg>
          Basic Info
        </h3>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="text-xs text-[var(--text-secondary)] font-medium">Task ID</span>
              <input
                type="text"
                value={editing.id}
                onChange={(e) => updateField('id', e.target.value)}
                disabled={!isNew}
                placeholder="e.g. paper_airplane"
                className="mt-1.5 w-full px-3 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl text-sm disabled:opacity-50 focus:border-[var(--accent)]/50 focus:ring-2 focus:ring-[var(--accent)]/20 outline-none transition-all"
              />
            </label>
            <label className="block">
              <span className="text-xs text-[var(--text-secondary)] font-medium">Name</span>
              <input
                type="text"
                value={editing.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="e.g. Fold a Paper Airplane"
                className="mt-1.5 w-full px-3 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl text-sm focus:border-[var(--accent)]/50 focus:ring-2 focus:ring-[var(--accent)]/20 outline-none transition-all"
              />
            </label>
          </div>
          <label className="block">
            <span className="text-xs text-[var(--text-secondary)] font-medium">Description</span>
            <textarea
              value={editing.description}
              onChange={(e) => updateField('description', e.target.value)}
              rows={2}
              className="mt-1.5 w-full px-3 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl text-sm focus:border-[var(--accent)]/50 focus:ring-2 focus:ring-[var(--accent)]/20 outline-none transition-all resize-none"
            />
          </label>
        </div>
      </div>

      {/* --- Section: Configuration --- */}
      <div className="mb-8 pt-6 border-t border-[var(--border)]">
        <h3 className="text-[11px] uppercase tracking-wider text-[var(--text-tertiary)] font-semibold mb-4 flex items-center gap-2">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>
          Configuration
        </h3>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="text-xs text-[var(--text-secondary)] font-medium">Difficulty</span>
              <select
                value={editing.difficulty}
                onChange={(e) => updateField('difficulty', e.target.value)}
                className="mt-1.5 w-full px-3 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl text-sm focus:border-[var(--accent)]/50 focus:ring-2 focus:ring-[var(--accent)]/20 outline-none transition-all"
                style={{ colorScheme: 'dark' }}
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-[var(--text-secondary)] font-medium">Estimated Time</span>
              <input
                type="text"
                value={editing.estimated_time}
                onChange={(e) => updateField('estimated_time', e.target.value)}
                placeholder="e.g. 5 minutes"
                className="mt-1.5 w-full px-3 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl text-sm focus:border-[var(--accent)]/50 focus:ring-2 focus:ring-[var(--accent)]/20 outline-none transition-all"
              />
            </label>
          </div>

          <div>
            <span className="text-xs text-[var(--text-secondary)] font-medium">AI Vision Tools</span>
            <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5 mb-2">
              Select which CV components annotate video frames during coaching
            </p>
            <CvToolPicker
              selected={editing.cv_tools ?? []}
              onChange={(ids) => updateField('cv_tools' as any, ids)}
            />
          </div>

          <label className="block">
            <span className="text-xs text-[var(--text-secondary)] font-medium">Components (one per line)</span>
            <textarea
              value={componentsText}
              onChange={(e) => { setComponentsText(e.target.value); setIsDirty(true); }}
              rows={3}
              placeholder={"1x Breadboard\n1x LED\n1x 220 ohm resistor"}
              className="mt-1.5 w-full px-3 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl text-sm font-mono focus:border-[var(--accent)]/50 focus:ring-2 focus:ring-[var(--accent)]/20 outline-none transition-all resize-none"
            />
          </label>
        </div>
      </div>

      {/* --- Section: Steps --- */}
      <div className="pt-6 border-t border-[var(--border)]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[11px] uppercase tracking-wider text-[var(--text-tertiary)] font-semibold flex items-center gap-2">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 0 1 0 3.75H5.625a1.875 1.875 0 0 1 0-3.75Z" /></svg>
            Steps ({editing.steps.length})
          </h3>
          <button
            onClick={addStep}
            className="flex items-center gap-1.5 text-xs text-[var(--accent)] hover:text-[var(--accent-hover)] font-medium transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
            Add Step
          </button>
        </div>

        <div className="space-y-3">
          {editing.steps.map((step, idx) => {
            const isCollapsed = collapsedSteps.has(idx);
            return (
              <div
                key={idx}
                className="glass-card !rounded-xl overflow-hidden transition-all"
              >
                {/* Step header — always visible */}
                <div
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-white/[0.02] transition-colors"
                  onClick={() => toggleStepCollapse(idx)}
                >
                  {/* Drag handle visual */}
                  <div className="flex flex-col gap-[3px] opacity-30 flex-shrink-0">
                    <div className="flex gap-[3px]"><div className="w-1 h-1 rounded-full bg-current" /><div className="w-1 h-1 rounded-full bg-current" /></div>
                    <div className="flex gap-[3px]"><div className="w-1 h-1 rounded-full bg-current" /><div className="w-1 h-1 rounded-full bg-current" /></div>
                    <div className="flex gap-[3px]"><div className="w-1 h-1 rounded-full bg-current" /><div className="w-1 h-1 rounded-full bg-current" /></div>
                  </div>

                  {/* Step number badge */}
                  <div className="w-6 h-6 rounded-full bg-[var(--accent)] flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
                    {idx + 1}
                  </div>

                  {/* Completeness ring */}
                  {isCollapsed && <StepRing step={step} />}

                  {/* Title preview */}
                  <span className={`text-sm flex-1 min-w-0 truncate ${isCollapsed ? 'text-[var(--text-secondary)]' : 'font-medium'}`}>
                    {step.instruction ? step.instruction.split('.')[0] || `Step ${idx + 1}` : `Step ${idx + 1} (empty)`}
                  </span>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => moveStep(idx, -1)} disabled={idx === 0} className="w-6 h-6 rounded flex items-center justify-center hover:bg-white/10 disabled:opacity-20 transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" /></svg>
                    </button>
                    <button onClick={() => moveStep(idx, 1)} disabled={idx === editing.steps.length - 1} className="w-6 h-6 rounded flex items-center justify-center hover:bg-white/10 disabled:opacity-20 transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
                    </button>
                    {editing.steps.length > 1 && (
                      <button onClick={() => removeStep(idx)} className="w-6 h-6 rounded flex items-center justify-center hover:bg-[var(--error)]/20 text-[var(--text-tertiary)] hover:text-[var(--error)] transition-colors">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    )}
                    <svg className={`w-4 h-4 text-[var(--text-tertiary)] transition-transform ${isCollapsed ? '' : 'rotate-180'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
                  </div>
                </div>

                {/* Step body — collapsible */}
                {!isCollapsed && (
                  <div className="px-4 pb-4 pt-1 space-y-3 border-t border-[var(--border)]">
                    <label className="block">
                      <span className="text-xs text-[var(--text-secondary)] font-medium">Instruction</span>
                      <textarea
                        value={step.instruction}
                        onChange={(e) => updateStep(idx, 'instruction', e.target.value)}
                        rows={2}
                        className="mt-1.5 w-full px-3 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl text-sm focus:border-[var(--accent)]/50 focus:ring-2 focus:ring-[var(--accent)]/20 outline-none transition-all resize-none"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs text-[var(--text-secondary)] font-medium">Visual Cue</span>
                      <input
                        type="text"
                        value={step.visual_cue}
                        onChange={(e) => updateStep(idx, 'visual_cue', e.target.value)}
                        className="mt-1.5 w-full px-3 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl text-sm focus:border-[var(--accent)]/50 focus:ring-2 focus:ring-[var(--accent)]/20 outline-none transition-all"
                      />
                    </label>
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs text-[var(--text-secondary)] font-medium">Common Errors</span>
                        <button
                          onClick={() => addCommonError(idx)}
                          className="text-[11px] text-[var(--accent)] hover:text-[var(--accent-hover)] font-medium transition-colors"
                        >
                          + Add
                        </button>
                      </div>
                      <div className="space-y-1.5">
                        {step.common_errors.map((err, errIdx) => (
                          <div key={errIdx} className="flex gap-2">
                            <input
                              type="text"
                              value={err}
                              onChange={(e) => updateCommonError(idx, errIdx, e.target.value)}
                              placeholder="e.g. Paper not aligned properly"
                              className="flex-1 px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl text-sm focus:border-[var(--accent)]/50 focus:ring-2 focus:ring-[var(--accent)]/20 outline-none transition-all"
                            />
                            {step.common_errors.length > 1 && (
                              <button
                                onClick={() => removeCommonError(idx, errIdx)}
                                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[var(--error)]/20 text-[var(--text-tertiary)] hover:text-[var(--error)] transition-colors flex-shrink-0 mt-0.5"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* --- Sticky bottom save bar --- */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--border)] bg-[var(--bg-primary)]/90 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isDirty && (
              <div className="flex items-center gap-2 text-sm text-[var(--warning)] animate-fade-in">
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--warning)]" />
                Unsaved changes
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setEditing(null); setCvProcessorInfo(null); setIsDirty(false); }}
              className="btn-secondary !py-2 !px-5 !text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary !py-2 !px-5 !text-sm disabled:opacity-50"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  {isNew ? 'Create Task' : 'Save Changes'}
                  <kbd className="kbd !text-white/40 !border-white/20 !bg-white/10">⌘S</kbd>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <div className="min-h-screen bg-grid">
      {/* Header */}
      <header className="border-b border-[var(--border)] bg-[var(--bg-primary)]/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <a href="#" className="text-xl font-bold tracking-tight">
              <span className="text-gradient">Guide</span>Sight
            </a>
            <span className="text-sm text-[var(--text-tertiary)]">/</span>
            <span className="text-sm text-[var(--text-secondary)] font-medium">Company Portal</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="#analytics" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
              Analytics
            </a>
            <a href="#" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
              Home
            </a>
          </div>
        </div>
      </header>

      <div className={`${editing ? 'max-w-7xl' : 'max-w-5xl'} mx-auto px-6 py-8`}>

      {/* Company badge */}
      <div className="glass-card flex items-center gap-3 px-5 py-3.5 mb-8 w-fit">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[var(--accent)] to-purple-500 flex items-center justify-center text-sm font-bold">AC</div>
        <div>
          <p className="font-medium text-sm">Acme Corporation</p>
          <p className="text-xs text-[var(--text-tertiary)]">{tasks.length} training task{tasks.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {showWizard ? (
        <TaskWizard
          onGenerated={handleWizardGenerated}
          onCancel={() => setShowWizard(false)}
        />
      ) : !editing ? (
        <>
          {/* Quick stats */}
          {tasks.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8 stagger-children">
              {[
                { label: 'Total Tasks', value: tasks.length, icon: <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /> },
                { label: 'Total Steps', value: tasks.reduce((acc, t) => acc + t.step_count, 0), icon: <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 0 1 0 3.75H5.625a1.875 1.875 0 0 1 0-3.75Z" /> },
                { label: 'Beginner', value: tasks.filter((t) => t.difficulty === 'beginner').length, color: 'text-emerald-400', icon: <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5" /> },
                { label: 'Advanced', value: tasks.filter((t) => t.difficulty === 'advanced').length, color: 'text-red-400', icon: <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z" /> },
              ].map((stat, i) => (
                <div key={i} className="glass-card !rounded-xl px-4 py-3.5">
                  <div className="flex items-center gap-2 mb-1.5">
                    <svg className="w-3.5 h-3.5 text-[var(--text-tertiary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>{stat.icon}</svg>
                    <span className="text-[11px] uppercase tracking-wider text-[var(--text-tertiary)] font-medium">{stat.label}</span>
                  </div>
                  <AnimatedStat value={stat.value} className={`text-2xl font-bold tabular-nums ${stat.color || ''}`} />
                </div>
              ))}
            </div>
          )}

          {/* Task list header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-lg">Training Tasks</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCmdPaletteOpen(true)}
                className="btn-secondary !py-2 !px-3 !text-xs !gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>
                <kbd className="kbd">⌘K</kbd>
              </button>
              <button
                onClick={handleNew}
                className="btn-primary !py-2 !px-4 !text-sm"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                Create Task
              </button>
            </div>
          </div>

          {/* Search and filter bar */}
          {tasks.length > 0 && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
              <div className="relative flex-1 max-w-xs">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search tasks..."
                  className="w-full pl-9 pr-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl text-sm focus:border-[var(--accent)]/50 focus:ring-2 focus:ring-[var(--accent)]/20 outline-none transition-all placeholder:text-[var(--text-tertiary)]"
                />
              </div>
              <div className="flex gap-1">
                {['all', 'beginner', 'intermediate', 'advanced'].map((d) => {
                  const isActive = filterDifficulty === d;
                  const diffConf = d !== 'all' ? DIFFICULTY_CONFIG[d] : null;
                  return (
                    <button
                      key={d}
                      onClick={() => setFilterDifficulty(d)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${
                        isActive
                          ? diffConf ? `${diffConf.bg} ${diffConf.text}` : 'bg-[var(--accent)]/10 text-[var(--accent)]'
                          : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-white/5'
                      }`}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Empty state */}
          {tasks.length === 0 ? (
            <div className="glass-card p-16 text-center animate-fade-in">
              <div className="w-16 h-16 rounded-2xl bg-[var(--accent-subtle)] flex items-center justify-center mx-auto mb-5">
                <svg className="w-8 h-8 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                </svg>
              </div>
              <h3 className="font-semibold text-lg mb-2">No training tasks yet</h3>
              <p className="text-sm text-[var(--text-secondary)] mb-6 max-w-sm mx-auto leading-relaxed">
                Create your first task to start coaching workers with real-time AI guidance. Use the AI wizard for instant task generation.
              </p>
              <button onClick={handleNew} className="btn-primary">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                Create Your First Task
              </button>
            </div>
          ) : (() => {
            const filteredTasks = tasks
              .filter((t) => filterDifficulty === 'all' || t.difficulty === filterDifficulty)
              .filter((t) => {
                if (!searchQuery) return true;
                const q = searchQuery.toLowerCase();
                return t.name.toLowerCase().includes(q) || t.id.toLowerCase().includes(q);
              });

            return filteredTasks.length === 0 ? (
              <div className="glass-card p-12 text-center animate-fade-in">
                <svg className="w-8 h-8 text-[var(--text-tertiary)] mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                </svg>
                <p className="text-sm text-[var(--text-secondary)] mb-1">No tasks match your filters</p>
                <button onClick={() => { setSearchQuery(''); setFilterDifficulty('all'); }} className="text-xs text-[var(--accent)] hover:underline">
                  Clear filters
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredTasks.map((t) => {
                  const diff = DIFFICULTY_CONFIG[t.difficulty] ?? { stripe: 'bg-[var(--text-tertiary)]', bg: 'bg-white/5', text: 'text-[var(--text-secondary)]' };
                  return (
                    <div
                      key={t.id}
                      className="group glass-card !rounded-xl overflow-hidden flex hover:border-[var(--border-hover)] hover:shadow-lg hover:shadow-black/20 transition-all duration-200 cursor-pointer"
                      onClick={() => handleEdit(t.id)}
                    >
                      {/* Left difficulty stripe */}
                      <div className={`w-1 flex-shrink-0 ${diff.stripe}`} />

                      <div className="flex-1 flex items-center justify-between px-5 py-4 min-w-0">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="font-medium group-hover:text-[var(--accent)] transition-colors truncate">{t.name}</h3>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${diff.bg} ${diff.text}`}>
                              {t.difficulty}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-[var(--text-tertiary)]">
                            <span className="font-mono">{t.id}</span>
                            <span>·</span>
                            <span>{t.step_count} steps</span>
                            <span>·</span>
                            <span>{t.estimated_time}</span>
                          </div>
                          {t.cv_tools && t.cv_tools.length > 0 && (
                            <div className="mt-2">
                              <CvToolBar toolIds={t.cv_tools} size="sm" showLabel={false} maxVisible={5} />
                            </div>
                          )}
                        </div>

                        {/* Overflow menu */}
                        <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                          <OverflowMenu
                            task={t}
                            onEdit={() => handleEdit(t.id)}
                            onDuplicate={() => handleDuplicate(t.id)}
                            onDelete={() => setDeleteTarget(t)}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </>
      ) : (
        <>
          {/* Desktop: two-column layout (form + inline chat) */}
          <div className="hidden lg:grid lg:grid-cols-[1fr_380px] lg:gap-6 lg:items-start">
            <div>{editFormContent}</div>
            <div className="sticky top-6" style={{ height: 'calc(100vh - 12rem)' }}>
              <TaskEditChat task={editing} onTaskUpdated={handleChatUpdate} mode="inline" />
            </div>
          </div>

          {/* Mobile: form only + floating chat bubble */}
          <div className="lg:hidden">
            {editFormContent}
            <TaskEditChat task={editing} onTaskUpdated={handleChatUpdate} mode="floating" />
          </div>
        </>
      )}
      </div>

      {/* Command Palette */}
      <CommandPalette
        tasks={tasks}
        isOpen={cmdPaletteOpen}
        onClose={() => setCmdPaletteOpen(false)}
        onEditTask={handleEdit}
        onDeleteTask={setDeleteTarget}
        onCreateTask={handleNew}
        onNavigate={(hash) => { window.location.hash = hash; }}
      />

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <DeleteModal
          taskName={deleteTarget.name}
          onConfirm={() => handleDelete(deleteTarget.id)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
