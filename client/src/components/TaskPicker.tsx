import type { TaskSummary } from '../types';
import { CvToolBar } from './CvToolBadge';

const DIFFICULTY_CONFIG: Record<string, { bg: string; text: string; dot: string }> = {
  beginner: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', dot: 'bg-emerald-400' },
  intermediate: { bg: 'bg-amber-500/10', text: 'text-amber-400', dot: 'bg-amber-400' },
  advanced: { bg: 'bg-red-500/10', text: 'text-red-400', dot: 'bg-red-400' },
};

interface TaskPickerProps {
  tasks: TaskSummary[];
  loading?: boolean;
  onSelect: (taskId: string) => void;
  error?: boolean;
  onRetry?: () => void;
}

function SkeletonCard() {
  return (
    <div className="glass-card p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="h-5 bg-white/5 rounded-lg w-2/3 animate-pulse" />
        <div className="h-5 bg-white/5 rounded-full w-16 animate-pulse" />
      </div>
      <div className="space-y-2 mb-5">
        <div className="h-3.5 bg-white/[0.03] rounded w-full animate-pulse" />
        <div className="h-3.5 bg-white/[0.03] rounded w-3/4 animate-pulse" />
      </div>
      <div className="flex gap-3">
        <div className="h-3 bg-white/[0.03] rounded w-14 animate-pulse" />
        <div className="h-3 bg-white/[0.03] rounded w-18 animate-pulse" />
      </div>
    </div>
  );
}

export function TaskPicker({ tasks, loading: isLoading, onSelect, error, onRetry }: TaskPickerProps) {
  const loading = isLoading ?? false;
  const isEmpty = !loading && !error && tasks.length === 0;

  return (
    <div className="min-h-screen bg-grid bg-mesh">
      {/* Header */}
      <header className="border-b border-[var(--border)] bg-[var(--bg-primary)]/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <a href="#" className="text-xl font-bold tracking-tight">
              <span className="text-gradient">Guide</span>Sight
            </a>
            <div className="hidden md:flex items-center gap-1.5 bg-[var(--bg-card)] border border-[var(--border)] rounded-full px-3 py-1">
              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[var(--accent)] to-purple-500 flex items-center justify-center text-[10px] font-bold">A</div>
              <span className="text-xs text-[var(--text-secondary)]">Acme Corporation</span>
            </div>
          </div>
          <a href="#" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
            </svg>
          </a>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Welcome section */}
        <div className="mb-10">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3 animate-fade-in">
            Your training tasks
          </h1>
          <p className="text-[var(--text-secondary)] text-base animate-fade-in" style={{ animationDelay: '80ms' }}>
            Select a task to begin real-time AI-guided coaching. Your camera and microphone will be used during the session.
          </p>
        </div>

        {/* Task grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 stagger-children">
          {error ? (
            <div className="col-span-full">
              <div className="glass-card p-12 text-center">
                <div className="w-14 h-14 rounded-2xl bg-[var(--error)]/10 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-7 h-7 text-[var(--error)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                  </svg>
                </div>
                <p className="text-[var(--text-primary)] font-medium mb-1">Failed to load tasks</p>
                <p className="text-sm text-[var(--text-secondary)] mb-5">Check that the server is running on port 8080</p>
                {onRetry && (
                  <button onClick={onRetry} className="btn-primary !py-2.5 !px-6">
                    Try Again
                  </button>
                )}
              </div>
            </div>
          ) : loading ? (
            Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)
          ) : isEmpty ? (
            <div className="col-span-full">
              <div className="glass-card p-12 text-center">
                <div className="w-14 h-14 rounded-2xl bg-[var(--accent-subtle)] flex items-center justify-center mx-auto mb-4">
                  <svg className="w-7 h-7 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m6.75 12H9.75m-1.5 3h7.5M6.75 3H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V7.875c0-.621-.504-1.125-1.125-1.125H18" />
                  </svg>
                </div>
                <p className="text-[var(--text-primary)] font-medium mb-1">No tasks yet</p>
                <p className="text-sm text-[var(--text-secondary)]">Ask your admin to create training tasks in the <a href="#admin" className="text-[var(--accent)] hover:underline">Company Portal</a></p>
              </div>
            </div>
          ) : (
            tasks.map((task) => {
              const diff = DIFFICULTY_CONFIG[task.difficulty] ?? { bg: 'bg-white/5', text: 'text-[var(--text-secondary)]', dot: 'bg-[var(--text-secondary)]' };
              return (
                <button
                  key={task.id}
                  onClick={() => onSelect(task.id)}
                  className="glass-card p-6 text-left group hover:border-[var(--accent)]/30 hover:shadow-[0_0_30px_var(--accent-glow)] transition-all duration-200"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-semibold text-base group-hover:text-[var(--accent)] transition-colors leading-tight pr-3">
                      {task.name}
                    </h3>
                    <span className={`inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full font-medium flex-shrink-0 ${diff.bg} ${diff.text}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${diff.dot}`} />
                      {task.difficulty}
                    </span>
                  </div>

                  <p className="text-sm text-[var(--text-secondary)] mb-4 line-clamp-2 leading-relaxed">
                    {task.description}
                  </p>

                  {task.cv_tools && task.cv_tools.length > 0 && (
                    <div className="mb-4">
                      <CvToolBar toolIds={task.cv_tools} size="sm" showLabel={false} maxVisible={4} />
                    </div>
                  )}

                  <div className="flex items-center gap-1 text-xs text-[var(--text-tertiary)]">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 0 1 0 3.75H5.625a1.875 1.875 0 0 1 0-3.75Z" />
                    </svg>
                    <span>{task.step_count} steps</span>
                    <span className="mx-1.5 text-[var(--border)]">|</span>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                    <span>{task.estimated_time}</span>
                    <span className="mx-1.5 text-[var(--border)]">|</span>
                    <span>{task.components.length} item{task.components.length !== 1 ? 's' : ''}</span>
                  </div>

                  {/* Hover arrow */}
                  <div className="mt-4 pt-4 border-t border-[var(--border)] flex items-center justify-between">
                    <span className="text-xs text-[var(--text-tertiary)] group-hover:text-[var(--accent)] transition-colors">Start training</span>
                    <svg className="w-4 h-4 text-[var(--text-tertiary)] group-hover:text-[var(--accent)] group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                    </svg>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
