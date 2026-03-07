import { useState, useEffect, useRef, useCallback } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { toast } from 'sonner';
import { CvToolBar } from './CvToolBadge';

// ============================================================
// DEMO DATA — all synthetic, showcasing what GuideSight tracks
// ============================================================

const PERIOD_OPTIONS = ['Last 7 days', 'Last 30 days', 'Last 90 days'] as const;
type Period = (typeof PERIOD_OPTIONS)[number];

// --- Hero KPIs ---
const HERO_KPIS: Record<Period, {
  totalSessions: number; completionRate: number; completionDelta: number;
  firstPassYield: number; fpyDelta: number; avgDuration: string; durationDelta: number;
  errorRate: number; errorDelta: number; activeWorkers: number; workerDelta: number;
  avgTimeToCompetency: string; competencyDelta: number;
  sparkSessions: number[]; sparkCompletion: number[]; sparkFpy: number[];
  sparkDuration: number[]; sparkErrors: number[]; sparkWorkers: number[];
}> = {
  'Last 7 days': {
    totalSessions: 47, completionRate: 87, completionDelta: +3,
    firstPassYield: 62, fpyDelta: +8, avgDuration: '4m 12s', durationDelta: -15,
    errorRate: 18.4, errorDelta: -5, activeWorkers: 12, workerDelta: +2,
    avgTimeToCompetency: '3.2 sessions', competencyDelta: -0.4,
    sparkSessions: [5, 6, 7, 6, 8, 7, 8],
    sparkCompletion: [78, 80, 83, 85, 84, 86, 87],
    sparkFpy: [48, 50, 54, 56, 58, 60, 62],
    sparkDuration: [310, 295, 280, 268, 260, 255, 252],
    sparkErrors: [28, 25, 23, 21, 20, 19, 18],
    sparkWorkers: [8, 9, 9, 10, 11, 11, 12],
  },
  'Last 30 days': {
    totalSessions: 184, completionRate: 83, completionDelta: +6,
    firstPassYield: 54, fpyDelta: +12, avgDuration: '4m 38s', durationDelta: -22,
    errorRate: 22.1, errorDelta: -9, activeWorkers: 18, workerDelta: +5,
    avgTimeToCompetency: '3.8 sessions', competencyDelta: -0.6,
    sparkSessions: [28, 34, 41, 38, 47],
    sparkCompletion: [72, 76, 80, 82, 83],
    sparkFpy: [38, 42, 48, 52, 54],
    sparkDuration: [340, 315, 290, 280, 278],
    sparkErrors: [32, 28, 25, 23, 22],
    sparkWorkers: [10, 12, 15, 16, 18],
  },
  'Last 90 days': {
    totalSessions: 512, completionRate: 79, completionDelta: +11,
    firstPassYield: 48, fpyDelta: +18, avgDuration: '5m 05s', durationDelta: -38,
    errorRate: 26.7, errorDelta: -14, activeWorkers: 24, workerDelta: +9,
    avgTimeToCompetency: '4.1 sessions', competencyDelta: -1.2,
    sparkSessions: [35, 42, 55, 62, 70, 75, 82, 91],
    sparkCompletion: [62, 66, 70, 73, 75, 77, 78, 79],
    sparkFpy: [28, 32, 36, 40, 42, 44, 46, 48],
    sparkDuration: [380, 360, 340, 320, 315, 310, 308, 305],
    sparkErrors: [38, 35, 32, 30, 28, 27, 27, 26],
    sparkWorkers: [8, 11, 14, 16, 18, 20, 22, 24],
  },
};

// --- Error hotspot heatmap: tasks × steps ---
const ERROR_HEATMAP = [
  {
    task: 'Paper Airplane', taskId: 'paper_airplane',
    cvTools: ['paper_detection', 'hand_tracking', 'edge_detection'],
    steps: [
      { step: 1, label: 'Center crease', errors: 8, sessions: 47, pct: 17, topError: 'Wrong fold direction' },
      { step: 2, label: 'Corner folds', errors: 14, sessions: 47, pct: 30, topError: 'Uneven corners' },
      { step: 3, label: 'Point fold down', errors: 21, sessions: 44, pct: 48, topError: 'Misalignment' },
      { step: 4, label: 'Second corners', errors: 11, sessions: 38, pct: 29, topError: 'Wrong orientation' },
      { step: 5, label: 'Lock tab', errors: 6, sessions: 35, pct: 17, topError: 'Incomplete fold' },
      { step: 6, label: 'Final fold + wings', errors: 9, sessions: 33, pct: 27, topError: 'Asymmetric wings' },
    ],
  },
  {
    task: 'LED Circuit', taskId: 'led_circuit',
    cvTools: ['object_detection', 'hand_tracking', 'color_segmentation'],
    steps: [
      { step: 1, label: 'Place LED', errors: 12, sessions: 41, pct: 29, topError: 'Wrong row' },
      { step: 2, label: 'Insert resistor', errors: 18, sessions: 41, pct: 44, topError: 'Wrong component' },
      { step: 3, label: 'Red jumper wire', errors: 7, sessions: 36, pct: 19, topError: 'Wrong column' },
      { step: 4, label: 'Black jumper wire', errors: 5, sessions: 35, pct: 14, topError: 'Reversed polarity' },
      { step: 5, label: 'Battery holder', errors: 10, sessions: 34, pct: 29, topError: 'Wrong orientation' },
      { step: 6, label: 'Insert battery', errors: 4, sessions: 32, pct: 13, topError: 'Reversed polarity' },
    ],
  },
];

// --- Completion trend (weekly) ---
const COMPLETION_TREND = [
  { week: 'Feb 3', sessions: 28, completed: 19, fpy: 8 },
  { week: 'Feb 10', sessions: 34, completed: 25, fpy: 13 },
  { week: 'Feb 17', sessions: 41, completed: 32, fpy: 19 },
  { week: 'Feb 24', sessions: 38, completed: 31, fpy: 21 },
  { week: 'Mar 3', sessions: 47, completed: 41, fpy: 29 },
];

// --- Error type distribution (Pareto) ---
const ERROR_TYPES = [
  { type: 'Wrong orientation', count: 34, pct: 24, cumulative: 24 },
  { type: 'Wrong component', count: 28, pct: 20, cumulative: 44 },
  { type: 'Incorrect sequence', count: 22, pct: 15, cumulative: 59 },
  { type: 'Misalignment', count: 19, pct: 13, cumulative: 73 },
  { type: 'Incomplete fold/press', count: 14, pct: 10, cumulative: 83 },
  { type: 'Reversed polarity', count: 11, pct: 8, cumulative: 90 },
  { type: 'Skipped step', count: 8, pct: 6, cumulative: 96 },
  { type: 'Safety concern', count: 6, pct: 4, cumulative: 100 },
];

// --- Worker performance ---
const WORKERS = [
  { name: 'Tanaka S.', sessions: 18, completed: 17, fpy: 12, avgTime: '3m 42s', errorsTotal: 14, trend: 'improving', certifiedTasks: 2, totalTasks: 2, lastActive: '2h ago', coachingDep: 0.3, recentErrors: [4, 3, 2, 1, 1, 0] },
  { name: 'Nakamura K.', sessions: 15, completed: 14, fpy: 9, avgTime: '4m 05s', errorsTotal: 19, trend: 'improving', certifiedTasks: 1, totalTasks: 2, lastActive: '1d ago', coachingDep: 0.5, recentErrors: [5, 4, 3, 3, 2] },
  { name: 'Sato Y.', sessions: 12, completed: 10, fpy: 5, avgTime: '4m 28s', errorsTotal: 24, trend: 'steady', certifiedTasks: 1, totalTasks: 2, lastActive: '3h ago', coachingDep: 0.7, recentErrors: [4, 4, 3, 4, 3] },
  { name: 'Watanabe R.', sessions: 11, completed: 8, fpy: 3, avgTime: '5m 15s', errorsTotal: 31, trend: 'improving', certifiedTasks: 0, totalTasks: 2, lastActive: '5h ago', coachingDep: 1.2, recentErrors: [6, 5, 5, 4, 3] },
  { name: 'Suzuki M.', sessions: 9, completed: 7, fpy: 2, avgTime: '5m 48s', errorsTotal: 28, trend: 'struggling', certifiedTasks: 0, totalTasks: 2, lastActive: '2d ago', coachingDep: 1.8, recentErrors: [6, 5, 5, 4, 4] },
  { name: 'Ito H.', sessions: 8, completed: 7, fpy: 4, avgTime: '4m 22s', errorsTotal: 15, trend: 'improving', certifiedTasks: 1, totalTasks: 2, lastActive: '6h ago', coachingDep: 0.6, recentErrors: [4, 3, 2, 2] },
];

// --- Learning curves ---
const LEARNING_CURVES: Record<string, { session: number; errors: number; duration: number }[]> = {
  'Tanaka S.': [
    { session: 1, errors: 4, duration: 312 },
    { session: 2, errors: 3, duration: 285 },
    { session: 3, errors: 2, duration: 261 },
    { session: 4, errors: 1, duration: 248 },
    { session: 5, errors: 1, duration: 230 },
    { session: 6, errors: 0, duration: 222 },
  ],
  'Suzuki M.': [
    { session: 1, errors: 6, duration: 402 },
    { session: 2, errors: 5, duration: 388 },
    { session: 3, errors: 5, duration: 371 },
    { session: 4, errors: 4, duration: 362 },
    { session: 5, errors: 4, duration: 348 },
  ],
};

// --- Voice interaction insights ---
const VOICE_INSIGHTS = {
  avgQuestionsPerSession: 2.4,
  avgCorrectionsPerSession: 1.8,
  avgSilenceBeforeAction: '3.2s',
  topQuestions: [
    { question: 'Which direction do I fold?', count: 18, step: 'Paper Airplane, Step 1' },
    { question: 'Is this the right resistor?', count: 14, step: 'LED Circuit, Step 2' },
    { question: 'How far down should I fold?', count: 11, step: 'Paper Airplane, Step 3' },
    { question: 'Which hole does this go in?', count: 9, step: 'LED Circuit, Step 1' },
    { question: 'Did I do that right?', count: 8, step: 'Various' },
  ],
  bargeInRate: 12,
};

// --- CV tool performance ---
const CV_PERFORMANCE = [
  { tool: 'hand_tracking', detections: 4280, errorsFound: 34, confidence: 94, fps: 4.8 },
  { tool: 'paper_detection', detections: 2140, errorsFound: 28, confidence: 87, fps: 4.9 },
  { tool: 'edge_detection', detections: 2140, errorsFound: 19, confidence: 78, fps: 5.0 },
  { tool: 'object_detection', detections: 1890, errorsFound: 22, confidence: 82, fps: 3.2 },
  { tool: 'color_segmentation', detections: 1890, errorsFound: 11, confidence: 91, fps: 5.0 },
];

// --- Actionable insights ---
const INSIGHTS = [
  {
    severity: 'high' as const, icon: '!',
    title: 'Step 3 of Paper Airplane is a major bottleneck',
    description: 'accounts for 48% of all paper airplane errors. Workers struggle with how far to fold the point down. Consider adding a ruler marking or reference line annotation.',
    metric: '48% error rate',
    action: 'Upload reference image showing correct fold distance',
  },
  {
    severity: 'high' as const, icon: '!',
    title: 'LED Circuit Step 2 has the highest error rate across all tasks',
    description: '44% of workers place the resistor in the wrong row. The instruction references "row 10 to row 6" but workers confuse breadboard numbering.',
    metric: '44% error rate',
    action: 'Add ArUco markers to breadboard for precise row labeling',
  },
  {
    severity: 'medium' as const, icon: 'i',
    title: 'Suzuki M. may need additional support',
    description: 'has not improved error rate over last 5 sessions (4-6 errors each). Coaching dependency score of 1.8 is 3x above team average.',
    metric: '1.8x coaching dependency',
    action: 'Schedule 1-on-1 with supervisor',
  },
  {
    severity: 'medium' as const, icon: 'i',
    title: 'Workers who ask questions have 30% higher first-pass yield',
    description: 'Workers averaging 2+ questions per session achieve 74% FPY vs. 52% for workers who ask zero questions. Encourage asking.',
    metric: '+30% FPY',
    action: 'Add "Ask me anything" prompt at start of each session',
  },
  {
    severity: 'low' as const, icon: 'T',
    title: 'Paper detection confidence drops below 80% in afternoon sessions',
    description: 'Afternoon sunlight causes glare. CV paper detection confidence averages 71% after 2pm vs. 92% in mornings.',
    metric: '71% vs 92% confidence',
    action: 'Recommend anti-glare workspace lighting',
  },
];

// --- Recent sessions log ---
const RECENT_SESSIONS = [
  { id: 'gs-a1b2c3', worker: 'Tanaka S.', task: 'Paper Airplane', date: 'Mar 6, 14:22', duration: '3m 18s', steps: '6/6', errors: 0, fpy: true, status: 'completed' as const },
  { id: 'gs-d4e5f6', worker: 'Nakamura K.', task: 'LED Circuit', date: 'Mar 6, 13:55', duration: '4m 42s', steps: '6/6', errors: 2, fpy: false, status: 'completed' as const },
  { id: 'gs-g7h8i9', worker: 'Sato Y.', task: 'Paper Airplane', date: 'Mar 6, 13:30', duration: '5m 01s', steps: '5/6', errors: 3, fpy: false, status: 'abandoned' as const },
  { id: 'gs-j1k2l3', worker: 'Watanabe R.', task: 'LED Circuit', date: 'Mar 6, 11:48', duration: '5m 55s', steps: '6/6', errors: 4, fpy: false, status: 'completed' as const },
  { id: 'gs-m4n5o6', worker: 'Suzuki M.', task: 'Paper Airplane', date: 'Mar 6, 11:15', duration: '6m 12s', steps: '4/6', errors: 5, fpy: false, status: 'abandoned' as const },
  { id: 'gs-p7q8r9', worker: 'Ito H.', task: 'LED Circuit', date: 'Mar 6, 10:30', duration: '4m 05s', steps: '6/6', errors: 1, fpy: false, status: 'completed' as const },
  { id: 'gs-s1t2u3', worker: 'Tanaka S.', task: 'LED Circuit', date: 'Mar 5, 16:10', duration: '3m 48s', steps: '6/6', errors: 0, fpy: true, status: 'completed' as const },
  { id: 'gs-v4w5x6', worker: 'Nakamura K.', task: 'Paper Airplane', date: 'Mar 5, 15:22', duration: '3m 55s', steps: '6/6', errors: 1, fpy: false, status: 'completed' as const },
];

// --- Step duration breakdown ---
const STEP_DURATIONS = [
  { task: 'Paper Airplane', step: 1, avg: 32, p25: 22, p75: 45, p95: 68 },
  { task: 'Paper Airplane', step: 2, avg: 48, p25: 35, p75: 62, p95: 88 },
  { task: 'Paper Airplane', step: 3, avg: 65, p25: 42, p75: 85, p95: 120 },
  { task: 'Paper Airplane', step: 4, avg: 52, p25: 38, p75: 68, p95: 95 },
  { task: 'Paper Airplane', step: 5, avg: 28, p25: 18, p75: 38, p95: 55 },
  { task: 'Paper Airplane', step: 6, avg: 58, p25: 40, p75: 78, p95: 110 },
];

// ============================================================
// SHARED COMPONENTS
// ============================================================

function useCountUp(target: number, duration = 1200) {
  const [value, setValue] = useState(0);
  const prevTarget = useRef(target);

  useEffect(() => {
    prevTarget.current = target;
    let start: number | null = null;
    let raf: number;
    const animate = (ts: number) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return value;
}

function Sparkline({ data, color = 'var(--accent)', width = 80, height = 24 }: {
  data: number[]; color?: string; width?: number; height?: number;
}) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(' ');
  const areaPoints = `0,${height} ${points} ${width},${height}`;
  const gradId = `spark-${Math.random().toString(36).slice(2, 8)}`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="block" role="img" aria-label="Trend sparkline">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill={`url(#${gradId})`} />
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ProgressRing({ value, size = 48, strokeWidth = 4, color }: {
  value: number; size?: number; strokeWidth?: number; color?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;
  const ringColor = color || (value >= 80 ? 'var(--success)' : value >= 60 ? 'var(--warning)' : 'var(--error)');

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="meter" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={strokeWidth} />
      <circle
        cx={size / 2} cy={size / 2} r={radius} fill="none"
        stroke={ringColor} strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 1.2s ease-out' }}
      />
    </svg>
  );
}

function HeatCell({ pct, label, errors, sessions, topError }: {
  pct: number; label: string; errors: number; sessions: number; topError?: string;
}) {
  const [hovered, setHovered] = useState(false);
  const bg =
    pct >= 40 ? 'bg-[var(--error)]' :
    pct >= 25 ? 'bg-[var(--warning)]' :
    pct >= 15 ? 'bg-[var(--warning)]/50' :
    'bg-[var(--success)]/40';

  return (
    <div className="relative" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <div className={`${bg} rounded px-2 py-1.5 text-center text-xs font-mono font-bold min-w-[48px] cursor-default`}>
        {pct}%
      </div>
      {hovered && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-48 p-2.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border)] shadow-xl text-left animate-fade-in" style={{ animationDuration: '150ms' }}>
          <p className="text-xs font-semibold mb-1">{label}</p>
          <p className="text-[10px] text-[var(--text-secondary)]">{errors} errors in {sessions} sessions</p>
          {topError && <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">Most common: {topError}</p>}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-[var(--bg-card)] border-r border-b border-[var(--border)]" />
        </div>
      )}
    </div>
  );
}

function MiniBar({ value, max, color, threshold }: { value: number; max: number; color: string; threshold?: number }) {
  const w = Math.min((value / max) * 100, 100);
  return (
    <div className="h-2 bg-white/5 rounded-full overflow-hidden w-24 relative">
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${w}%`, backgroundColor: color }} />
      {threshold && (
        <div className="absolute top-0 bottom-0 border-l border-dashed border-white/30" style={{ left: `${(threshold / max) * 100}%` }} />
      )}
    </div>
  );
}

function TrendArrow({ delta, suffix = '%', invert = false }: { delta: number; suffix?: string; invert?: boolean }) {
  const isGood = invert ? delta < 0 : delta > 0;
  const color = isGood ? 'text-[var(--success)]' : 'text-[var(--error)]';
  const arrow = delta > 0 ? '\u2191' : '\u2193';
  return (
    <span className={`text-xs font-medium ${color}`}>
      {arrow} {Math.abs(delta)}{suffix}
    </span>
  );
}

function SeverityBadge({ severity }: { severity: 'high' | 'medium' | 'low' }) {
  const styles = {
    high: 'bg-[var(--error)]/20 text-[var(--error)]',
    medium: 'bg-[var(--warning)]/20 text-[var(--warning)]',
    low: 'bg-[var(--accent)]/20 text-[var(--accent)]',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${styles[severity]}`}>
      {severity}
    </span>
  );
}

function TrendBadge({ trend }: { trend: string }) {
  const styles: Record<string, string> = {
    improving: 'bg-[var(--success)]/20 text-[var(--success)]',
    steady: 'bg-[var(--warning)]/20 text-[var(--warning)]',
    struggling: 'bg-[var(--error)]/20 text-[var(--error)]',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${styles[trend] ?? 'bg-white/10 text-[var(--text-secondary)]'}`}>
      {trend}
    </span>
  );
}

function StatusDot({ status }: { status: string }) {
  const color = status === 'completed' ? 'bg-[var(--success)]' : 'bg-[var(--error)]';
  return (
    <div className="flex items-center justify-center" title={status}>
      <div className={`w-2 h-2 rounded-full ${color}`} />
    </div>
  );
}

function InfoTooltip({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  return (
    <span className="relative inline-flex" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      <span className="w-3.5 h-3.5 rounded-full border border-[var(--text-tertiary)] text-[var(--text-tertiary)] flex items-center justify-center text-[8px] cursor-help ml-1">
        ?
      </span>
      {show && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-2.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border)] shadow-xl text-left z-50 animate-fade-in" style={{ animationDuration: '150ms' }}>
          <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed">{text}</p>
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-[var(--bg-card)] border-r border-b border-[var(--border)]" />
        </div>
      )}
    </span>
  );
}

function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-4">
      <h3 className="font-semibold">{title}</h3>
      <p className="text-xs text-[var(--text-tertiary)] mt-0.5">{description}</p>
    </div>
  );
}

// ============================================================
// MAIN DASHBOARD
// ============================================================

type Tab = 'overview' | 'errors' | 'workers' | 'voice' | 'sessions';

const TAB_META: { id: Tab; label: string; shortcut: string }[] = [
  { id: 'overview', label: 'Overview', shortcut: '1' },
  { id: 'errors', label: 'Error Analysis', shortcut: '2' },
  { id: 'workers', label: 'Workers', shortcut: '3' },
  { id: 'voice', label: 'Voice Insights', shortcut: '4' },
  { id: 'sessions', label: 'Session Log', shortcut: '5' },
];

export function AnalyticsDashboard() {
  const [period, setPeriod] = useState<Period>('Last 7 days');
  const [tab, setTab] = useState<Tab>('overview');
  const [selectedWorker, setSelectedWorker] = useState<string | null>(null);
  const [dismissedInsights, setDismissedInsights] = useState<Set<number>>(new Set());
  const [resolvedInsights, setResolvedInsights] = useState<Set<number>>(new Set());
  const kpis = HERO_KPIS[period];

  const unresolvedHigh = INSIGHTS.filter((ins, i) => ins.severity === 'high' && !dismissedInsights.has(i) && !resolvedInsights.has(i)).length;

  const tabBadges: Record<Tab, number | null> = {
    overview: unresolvedHigh > 0 ? unresolvedHigh : null,
    errors: ERROR_TYPES.reduce((a, e) => a + e.count, 0),
    workers: WORKERS.length,
    voice: null,
    sessions: RECENT_SESSIONS.length,
  };

  // Keyboard shortcuts for tabs
  useHotkeys('1', () => setTab('overview'));
  useHotkeys('2', () => setTab('errors'));
  useHotkeys('3', () => setTab('workers'));
  useHotkeys('4', () => setTab('voice'));
  useHotkeys('5', () => setTab('sessions'));

  // Period cycling
  const cyclePeriod = useCallback((dir: 1 | -1) => {
    const idx = PERIOD_OPTIONS.indexOf(period);
    const next = PERIOD_OPTIONS[Math.max(0, Math.min(PERIOD_OPTIONS.length - 1, idx + dir))];
    if (next) setPeriod(next);
  }, [period]);
  useHotkeys('[', () => cyclePeriod(-1));
  useHotkeys(']', () => cyclePeriod(1));

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Link copied to clipboard');
  };

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
            <span className="text-sm text-[var(--text-secondary)] font-medium">Analytics</span>
            <div className="flex items-center gap-1.5 ml-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[var(--success)] breathe-ring" />
              <span className="text-[10px] text-[var(--text-tertiary)]">Live</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Period pill toggle */}
            <div className="flex bg-white/5 rounded-lg p-0.5">
              {(['Last 7 days', 'Last 30 days', 'Last 90 days'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                    period === p
                      ? 'bg-[var(--accent)] text-white shadow-sm'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {p.replace('Last ', '').replace(' days', 'd')}
                </button>
              ))}
            </div>
            {/* Copy link */}
            <button
              onClick={handleCopyLink}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              title="Copy link"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            </button>
            {/* Print */}
            <button
              onClick={() => window.print()}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors no-print"
              title="Print / Export PDF"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 6 2 18 2 18 9" />
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                <rect x="6" y="14" width="12" height="8" />
              </svg>
            </button>
            <a href="#admin" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
              Portal
            </a>
            <a href="#" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
              Home
            </a>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6">

      {/* Hero KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8 stagger-children">
        <KpiCard label="Sessions" value={kpis.totalSessions} spark={kpis.sparkSessions} sparkColor="var(--accent)" />
        <KpiCard label="Completion" value={kpis.completionRate} suffix="%" delta={kpis.completionDelta} deltaSuffix="pp" spark={kpis.sparkCompletion} sparkColor="var(--success)" ring />
        <KpiCard label="First Pass Yield" value={kpis.firstPassYield} suffix="%" delta={kpis.fpyDelta} deltaSuffix="pp" spark={kpis.sparkFpy} sparkColor="var(--accent)" />
        <KpiCard label="Avg Duration" rawValue={kpis.avgDuration} delta={kpis.durationDelta} deltaSuffix="s" invert spark={kpis.sparkDuration} sparkColor="var(--warning)" />
        <KpiCard label="Error Rate" value={kpis.errorRate} suffix="/100" delta={kpis.errorDelta} deltaSuffix="" invert spark={kpis.sparkErrors} sparkColor="var(--error)" />
        <KpiCard label="Active Workers" value={kpis.activeWorkers} delta={kpis.workerDelta} deltaSuffix="" spark={kpis.sparkWorkers} sparkColor="var(--accent)" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 overflow-x-auto pb-1 border-b border-[var(--border)] sticky top-16 z-30 bg-[var(--bg-primary)]/80 backdrop-blur-xl -mx-6 px-6">
        {TAB_META.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap relative group ${
              tab === t.id
                ? 'text-[var(--text-primary)]'
                : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
            }`}
          >
            <span className="flex items-center gap-1.5">
              {t.label}
              {tabBadges[t.id] !== null && (
                <span className={`min-w-[18px] h-[18px] rounded-full text-[10px] font-mono inline-flex items-center justify-center px-1 ${
                  tab === t.id ? 'bg-[var(--accent)]/20 text-[var(--accent)]' : 'bg-white/10 text-[var(--text-tertiary)]'
                }`}>
                  {tabBadges[t.id]}
                </span>
              )}
              <span className="kbd opacity-0 group-hover:opacity-100 transition-opacity ml-1 !text-[8px] !px-1 !py-0">
                {t.shortcut}
              </span>
            </span>
            {tab === t.id && (
              <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-[var(--accent)] rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="animate-fade-in" key={tab}>
        {tab === 'overview' && <OverviewTab dismissedInsights={dismissedInsights} resolvedInsights={resolvedInsights} onDismiss={(i) => setDismissedInsights((s) => new Set(s).add(i))} onResolve={(i) => setResolvedInsights((s) => new Set(s).add(i))} />}
        {tab === 'errors' && <ErrorsTab />}
        {tab === 'workers' && <WorkersTab selectedWorker={selectedWorker} onSelectWorker={setSelectedWorker} />}
        {tab === 'voice' && <VoiceTab />}
        {tab === 'sessions' && <SessionsTab />}
      </div>
      </div>
    </div>
  );
}

// ============================================================
// KPI CARD
// ============================================================

function KpiCard({ label, value, rawValue, suffix = '', delta, deltaSuffix, invert, spark, sparkColor, ring }: {
  label: string; value?: number; rawValue?: string; suffix?: string;
  delta?: number; deltaSuffix?: string; invert?: boolean;
  spark?: number[]; sparkColor?: string; ring?: boolean;
}) {
  const animVal = useCountUp(value ?? 0);
  const displayVal = rawValue ?? `${animVal}${suffix}`;

  return (
    <div className="glass-card p-4 flex flex-col justify-between min-h-[100px]">
      <p className="text-[11px] text-[var(--text-tertiary)] uppercase tracking-wider font-semibold mb-1.5">{label}</p>
      <div className="flex items-end justify-between gap-2">
        <div>
          <div className="flex items-end gap-2">
            <span className="text-xl font-bold tabular-nums">{displayVal}</span>
            {delta !== undefined && delta !== null && (
              <TrendArrow delta={delta} suffix={deltaSuffix || '%'} invert={invert} />
            )}
          </div>
        </div>
        {ring && value !== undefined ? (
          <ProgressRing value={value} size={36} strokeWidth={3} />
        ) : spark && spark.length > 1 ? (
          <Sparkline data={spark} color={sparkColor} width={64} height={20} />
        ) : null}
      </div>
    </div>
  );
}

// ============================================================
// TAB: Overview
// ============================================================

function OverviewTab({ dismissedInsights, resolvedInsights, onDismiss, onResolve }: {
  dismissedInsights: Set<number>; resolvedInsights: Set<number>;
  onDismiss: (i: number) => void; onResolve: (i: number) => void;
}) {
  const [barsVisible, setBarsVisible] = useState(false);
  useEffect(() => { const t = setTimeout(() => setBarsVisible(true), 100); return () => clearTimeout(t); }, []);

  return (
    <div className="space-y-6">
      {/* ROI Summary Card */}
      <div className="rounded-xl p-5 relative overflow-hidden" style={{
        background: 'linear-gradient(135deg, rgba(108, 99, 255, 0.08), rgba(34, 197, 94, 0.06))',
        border: '1px solid rgba(108, 99, 255, 0.15)',
      }}>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <p className="text-xs text-[var(--text-tertiary)] uppercase tracking-wider font-semibold mb-1">Estimated Training Cost Savings</p>
            <p className="text-3xl font-bold text-[var(--success)]">$2,400</p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">this month vs. human instructor costs</p>
          </div>
          <div className="flex gap-6">
            <div className="text-center">
              <p className="text-lg font-bold tabular-nums">184</p>
              <p className="text-[10px] text-[var(--text-tertiary)] uppercase">Sessions</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold tabular-nums">46h</p>
              <p className="text-[10px] text-[var(--text-tertiary)] uppercase">Hours Replaced</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold tabular-nums">$52</p>
              <p className="text-[10px] text-[var(--text-tertiary)] uppercase">/hr Savings</p>
            </div>
          </div>
        </div>
      </div>

      {/* Completion trend + Error heatmap */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly trend */}
        <div className="bg-[var(--bg-card)] rounded-xl p-5">
          <SectionHeader title="Weekly Trend" description="Session completion and first-pass yield over the last 5 weeks" />
          <div className="space-y-3">
            {COMPLETION_TREND.map((w, idx) => {
              const compRate = Math.round((w.completed / w.sessions) * 100);
              const fpyRate = Math.round((w.fpy / w.sessions) * 100);
              return (
                <div key={w.week} className="flex items-center gap-3">
                  <span className="text-xs text-[var(--text-secondary)] w-14">{w.week}</span>
                  <div className="flex-1">
                    <div className="flex gap-1 h-5">
                      <div
                        className="bg-[var(--accent)] rounded-sm h-full transition-all duration-700 ease-out"
                        style={{
                          width: barsVisible ? `${compRate}%` : '0%',
                          transitionDelay: `${idx * 80}ms`,
                        }}
                        title={`${compRate}% completion`}
                      />
                      <div
                        className="bg-[var(--success)] rounded-sm h-full transition-all duration-700 ease-out"
                        style={{
                          width: barsVisible ? `${fpyRate}%` : '0%',
                          transitionDelay: `${idx * 80 + 50}ms`,
                        }}
                        title={`${fpyRate}% first pass yield`}
                      />
                    </div>
                  </div>
                  <span className="text-xs text-[var(--text-secondary)] w-20 text-right">
                    {w.completed}/{w.sessions} done
                  </span>
                </div>
              );
            })}
          </div>
          <div className="flex gap-4 mt-3 text-xs text-[var(--text-secondary)]">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-[var(--accent)] rounded-sm" /> Completed</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-[var(--success)] rounded-sm" /> First Pass</span>
          </div>
        </div>

        {/* Error heatmap */}
        <div className="bg-[var(--bg-card)] rounded-xl p-5">
          <SectionHeader title="Error Hotspots by Step" description="Identify which steps cause the most errors across all tasks" />
          <div className="space-y-4">
            {ERROR_HEATMAP.map((task) => (
              <div key={task.taskId}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium">{task.task}</span>
                  <CvToolBar toolIds={task.cvTools} size="sm" showLabel={false} maxVisible={3} />
                </div>
                <div className="flex gap-1.5">
                  {task.steps.map((s) => (
                    <div key={s.step} className="flex-1">
                      <HeatCell pct={s.pct} label={`Step ${s.step}: ${s.label}`} errors={s.errors} sessions={s.sessions} topError={s.topError} />
                      <p className="text-[10px] text-[var(--text-secondary)] text-center mt-1 leading-tight">{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {/* Gradient legend */}
          <div className="flex items-center gap-2 mt-4">
            <span className="text-[10px] text-[var(--text-tertiary)]">0%</span>
            <div className="flex-1 h-2 rounded-full" style={{
              background: 'linear-gradient(to right, rgba(34,197,94,0.4), rgba(245,158,11,0.5), rgba(239,68,68,1))',
            }} />
            <span className="text-[10px] text-[var(--text-tertiary)]">50%+</span>
          </div>
        </div>
      </div>

      <div className="section-glow-divider my-2" />

      {/* Actionable Insights */}
      <div className="bg-[var(--bg-card)] rounded-xl p-5">
        <SectionHeader title="Actionable Insights" description="AI-generated recommendations based on session data patterns" />
        <div className="space-y-3">
          {INSIGHTS.map((insight, i) => {
            const isDismissed = dismissedInsights.has(i);
            const isResolved = resolvedInsights.has(i);
            if (isDismissed) return null;
            return (
              <div key={i} className={`bg-[var(--bg-secondary)] rounded-lg p-4 transition-opacity ${isResolved ? 'opacity-50' : ''}`}>
                <div className="flex items-start gap-3">
                  <div className="flex flex-col items-center gap-2 pt-0.5">
                    <SeverityBadge severity={insight.severity} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium mb-1 ${isResolved ? 'line-through' : ''}`}>{insight.title}</p>
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{insight.description}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs font-mono font-bold text-[var(--accent)]">{insight.metric}</span>
                      {insight.action && (
                        <span className="text-xs text-[var(--text-secondary)]">
                          Suggested: <span className="text-[var(--text-primary)]">{insight.action}</span>
                        </span>
                      )}
                    </div>
                  </div>
                  {!isResolved && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => onResolve(i)}
                        className="text-[10px] px-2 py-1 rounded text-[var(--success)] hover:bg-[var(--success)]/10 transition-colors"
                        title="Mark as resolved"
                      >
                        Resolve
                      </button>
                      <button
                        onClick={() => onDismiss(i)}
                        className="text-[10px] px-2 py-1 rounded text-[var(--text-tertiary)] hover:bg-white/5 transition-colors"
                        title="Dismiss"
                      >
                        Dismiss
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="section-glow-divider my-2" />

      {/* Step Duration Distribution */}
      <div className="bg-[var(--bg-card)] rounded-xl p-5">
        <SectionHeader title="Step Duration Distribution — Paper Airplane" description="Box plot showing P25-P75 range, median, and P95 outlier threshold per step" />
        <div className="space-y-2">
          {STEP_DURATIONS.map((s) => (
            <div key={s.step} className="flex items-center gap-3 group">
              <span className="text-xs text-[var(--text-secondary)] w-16">Step {s.step}</span>
              <div className="flex-1 relative h-6">
                <div
                  className="absolute h-full bg-[var(--accent)]/30 rounded"
                  style={{ left: `${(s.p25 / 130) * 100}%`, width: `${((s.p75 - s.p25) / 130) * 100}%` }}
                />
                <div
                  className="absolute h-full w-0.5 bg-[var(--accent)]"
                  style={{ left: `${(s.avg / 130) * 100}%` }}
                />
                <div
                  className="absolute top-1/2 h-px bg-[var(--text-secondary)]"
                  style={{ left: `${(s.p75 / 130) * 100}%`, width: `${((s.p95 - s.p75) / 130) * 100}%`, transform: 'translateY(-50%)' }}
                />
              </div>
              <span className="text-xs font-mono text-[var(--text-secondary)] w-10 text-right">{s.avg}s</span>
            </div>
          ))}
        </div>
        <div className="flex gap-4 mt-3 text-xs text-[var(--text-secondary)]">
          <span className="flex items-center gap-1.5"><span className="w-6 h-3 bg-[var(--accent)]/30 rounded" /> P25-P75</span>
          <span className="flex items-center gap-1.5"><span className="w-0.5 h-3 bg-[var(--accent)]" /> Median</span>
          <span className="flex items-center gap-1.5"><span className="w-6 h-px bg-[var(--text-secondary)]" /> P95</span>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// TAB: Error Analysis
// ============================================================

function ErrorsTab() {
  const [barsVisible, setBarsVisible] = useState(false);
  useEffect(() => { const t = setTimeout(() => setBarsVisible(true), 100); return () => clearTimeout(t); }, []);
  const _maxCount = ERROR_TYPES[0].count;
  void _maxCount;

  return (
    <div className="space-y-6">
      {/* Error Pareto */}
      <div className="bg-[var(--bg-card)] rounded-xl p-5">
        <SectionHeader title="Error Type Distribution (Pareto)" description="Top error types ranked by frequency — top 3 account for 59% of all errors" />
        <div className="relative">
          <div className="space-y-2">
            {ERROR_TYPES.map((e, idx) => (
              <div key={e.type} className="flex items-center gap-3">
                <span className="text-xs w-36 truncate text-[var(--text-secondary)]">{e.type}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[var(--error)]/70 rounded-full transition-all duration-700 ease-out"
                        style={{
                          width: barsVisible ? `${e.pct}%` : '0%',
                          transitionDelay: `${idx * 60}ms`,
                        }}
                      />
                    </div>
                    <span className="text-xs font-mono w-8 text-right">{e.count}</span>
                  </div>
                </div>
                <span className="text-xs font-mono text-[var(--text-secondary)] w-12 text-right">
                  {e.cumulative}%
                </span>
              </div>
            ))}
          </div>
          {/* Cumulative Pareto line overlay */}
          <svg className="absolute top-0 right-12 h-full pointer-events-none" width="48" viewBox="0 0 48 200" preserveAspectRatio="none">
            <polyline
              points={ERROR_TYPES.map((e, i) => {
                const y = (i * 200) / (ERROR_TYPES.length - 1) + 12;
                const x = (e.cumulative / 100) * 48;
                return `${x},${y}`;
              }).join(' ')}
              fill="none"
              stroke="var(--accent)"
              strokeWidth="1.5"
              strokeDasharray="3,3"
              opacity="0.5"
            />
          </svg>
        </div>
      </div>

      {/* Heatmap expanded */}
      <div className="bg-[var(--bg-card)] rounded-xl p-5">
        <SectionHeader title="Error Rate by Task and Step" description="Sorted by error rate descending — focus improvement on top rows" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-[var(--text-secondary)] uppercase">
                <th className="text-left py-2 pr-4">Task</th>
                <th className="text-left py-2 pr-3">Step</th>
                <th className="text-left py-2 pr-3">Label</th>
                <th className="text-right py-2 pr-3">Errors</th>
                <th className="text-right py-2 pr-3">Sessions</th>
                <th className="text-right py-2">Error Rate</th>
              </tr>
            </thead>
            <tbody>
              {ERROR_HEATMAP.flatMap((task) =>
                task.steps.sort((a, b) => b.pct - a.pct).map((s) => (
                  <tr key={`${task.taskId}-${s.step}`} className="border-t border-white/5 hover:bg-white/[0.03]">
                    <td className="py-2 pr-4 text-[var(--text-secondary)]">{task.task}</td>
                    <td className="py-2 pr-3">{s.step}</td>
                    <td className="py-2 pr-3 text-[var(--text-secondary)]">{s.label}</td>
                    <td className="py-2 pr-3 text-right font-mono">{s.errors}</td>
                    <td className="py-2 pr-3 text-right font-mono text-[var(--text-secondary)]">{s.sessions}</td>
                    <td className="py-2 text-right">
                      <HeatCell pct={s.pct} label={`${task.task} Step ${s.step}: ${s.label}`} errors={s.errors} sessions={s.sessions} topError={s.topError} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CV Tool Performance */}
      <div className="bg-[var(--bg-card)] rounded-xl p-5">
        <SectionHeader title="CV Tool Performance" description="Detection accuracy and throughput per computer vision processor" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-[var(--text-secondary)] uppercase">
                <th className="text-left py-2">Tool</th>
                <th className="text-right py-2">Detections</th>
                <th className="text-right py-2">Errors Found</th>
                <th className="text-right py-2">
                  <span className="flex items-center justify-end gap-0.5">
                    Confidence
                    <InfoTooltip text="Detection confidence threshold: 85% = production-ready. Tools below 85% may need model fine-tuning or better lighting conditions." />
                  </span>
                </th>
                <th className="text-right py-2">Avg FPS</th>
              </tr>
            </thead>
            <tbody>
              {CV_PERFORMANCE.map((cv) => (
                <tr key={cv.tool} className="border-t border-white/5 hover:bg-white/[0.03]">
                  <td className="py-2.5"><CvToolBar toolIds={[cv.tool]} size="sm" /></td>
                  <td className="py-2.5 text-right font-mono">{cv.detections.toLocaleString()}</td>
                  <td className="py-2.5 text-right font-mono">{cv.errorsFound}</td>
                  <td className="py-2.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <MiniBar value={cv.confidence} max={100} color={cv.confidence >= 85 ? '#4ade80' : '#fbbf24'} threshold={85} />
                      <span className="font-mono text-xs">{cv.confidence}%</span>
                    </div>
                  </td>
                  <td className="py-2.5 text-right font-mono text-[var(--text-secondary)]">{cv.fps}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// TAB: Workers
// ============================================================

function WorkersTab({ selectedWorker, onSelectWorker }: {
  selectedWorker: string | null; onSelectWorker: (w: string | null) => void;
}) {
  const curve = selectedWorker ? LEARNING_CURVES[selectedWorker] : null;

  return (
    <div className="space-y-6">
      {/* Worker table */}
      <div className="bg-[var(--bg-card)] rounded-xl p-5">
        <SectionHeader title="Worker Performance" description="Click any row to view detailed learning curve. Sorted by first-pass yield." />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-[var(--text-secondary)] uppercase">
                <th className="text-left py-2">Worker</th>
                <th className="text-right py-2">Sessions</th>
                <th className="text-right py-2">FPY</th>
                <th className="text-right py-2">Avg Time</th>
                <th className="text-right py-2">Errors</th>
                <th className="text-center py-2">Trend</th>
                <th className="text-center py-2">Certified</th>
                <th className="text-right py-2">
                  <span className="flex items-center justify-end gap-0.5">
                    Coaching Dep.
                    <InfoTooltip text="Coaching Dependency = (AI corrections + questions) / steps completed. Lower is more autonomous. <0.5 = ready for certification. >1.0 = needs intervention." />
                  </span>
                </th>
                <th className="text-right py-2">Last Active</th>
              </tr>
            </thead>
            <tbody>
              {WORKERS.map((w) => (
                <tr
                  key={w.name}
                  className={`border-t border-white/5 cursor-pointer transition-colors ${
                    selectedWorker === w.name ? 'bg-[var(--accent)]/10' : 'hover:bg-white/[0.03]'
                  }`}
                  onClick={() => onSelectWorker(selectedWorker === w.name ? null : w.name)}
                >
                  <td className="py-2.5 font-medium">{w.name}</td>
                  <td className="py-2.5 text-right font-mono">{w.completed}/{w.sessions}</td>
                  <td className="py-2.5 text-right font-mono">{Math.round((w.fpy / w.sessions) * 100)}%</td>
                  <td className="py-2.5 text-right font-mono text-[var(--text-secondary)]">{w.avgTime}</td>
                  <td className="py-2.5 text-right font-mono">{w.errorsTotal}</td>
                  <td className="py-2.5 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <Sparkline
                        data={w.recentErrors}
                        color={w.trend === 'improving' ? 'var(--success)' : w.trend === 'steady' ? 'var(--warning)' : 'var(--error)'}
                        width={48}
                        height={16}
                      />
                      <TrendBadge trend={w.trend} />
                    </div>
                  </td>
                  <td className="py-2.5 text-center font-mono">{w.certifiedTasks}/{w.totalTasks}</td>
                  <td className="py-2.5 text-right">
                    <span className={`font-mono text-xs ${w.coachingDep > 1 ? 'text-[var(--error)]' : w.coachingDep > 0.6 ? 'text-[var(--warning)]' : 'text-[var(--success)]'}`}>
                      {w.coachingDep.toFixed(1)}
                    </span>
                  </td>
                  <td className="py-2.5 text-right text-xs text-[var(--text-secondary)]">{w.lastActive}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Learning curve */}
      {selectedWorker && (
        <div className="bg-[var(--bg-card)] rounded-xl p-5 animate-fade-in">
          <SectionHeader title={`Learning Curve — ${selectedWorker}`} description="Errors and session duration over time — a downward slope indicates skill acquisition" />
          {curve ? (
            <div>
              {/* SVG Line Chart */}
              <div className="relative h-40">
                <svg width="100%" height="100%" viewBox="0 0 300 120" preserveAspectRatio="none" role="img" aria-label={`Learning curve for ${selectedWorker}`}>
                  <defs>
                    <linearGradient id="errGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--error)" stopOpacity="0.15" />
                      <stop offset="100%" stopColor="var(--error)" stopOpacity="0" />
                    </linearGradient>
                    <linearGradient id="durGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.15" />
                      <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  {/* Error line + area */}
                  {(() => {
                    const maxErr = Math.max(...curve.map((c) => c.errors), 1);
                    const points = curve.map((c, i) => {
                      const x = (i / (curve.length - 1)) * 280 + 10;
                      const y = 110 - (c.errors / maxErr) * 90;
                      return `${x},${y}`;
                    }).join(' ');
                    const area = `10,110 ${points} ${(curve.length - 1) / (curve.length - 1) * 280 + 10},110`;
                    return (
                      <>
                        <polygon points={area} fill="url(#errGrad)" />
                        <polyline points={points} fill="none" stroke="var(--error)" strokeWidth="2" strokeLinecap="round" />
                        {curve.map((c, i) => {
                          const x = (i / (curve.length - 1)) * 280 + 10;
                          const y = 110 - (c.errors / maxErr) * 90;
                          return <circle key={`e${i}`} cx={x} cy={y} r="3" fill="var(--error)" />;
                        })}
                      </>
                    );
                  })()}
                  {/* Duration line + area */}
                  {(() => {
                    const maxDur = Math.max(...curve.map((c) => c.duration));
                    const minDur = Math.min(...curve.map((c) => c.duration));
                    const range = maxDur - minDur || 1;
                    const points = curve.map((c, i) => {
                      const x = (i / (curve.length - 1)) * 280 + 10;
                      const y = 110 - ((c.duration - minDur) / range) * 90;
                      return `${x},${y}`;
                    }).join(' ');
                    const area = `10,110 ${points} ${(curve.length - 1) / (curve.length - 1) * 280 + 10},110`;
                    return (
                      <>
                        <polygon points={area} fill="url(#durGrad)" />
                        <polyline points={points} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeDasharray="4,4" />
                        {curve.map((c, i) => {
                          const x = (i / (curve.length - 1)) * 280 + 10;
                          const y = 110 - ((c.duration - minDur) / range) * 90;
                          return <circle key={`d${i}`} cx={x} cy={y} r="3" fill="var(--accent)" />;
                        })}
                      </>
                    );
                  })()}
                  {/* X axis labels */}
                  {curve.map((c, i) => {
                    const x = (i / (curve.length - 1)) * 280 + 10;
                    return <text key={i} x={x} y={118} textAnchor="middle" fill="var(--text-tertiary)" fontSize="8">S{c.session}</text>;
                  })}
                </svg>
              </div>
              <div className="flex gap-4 mt-2 text-xs text-[var(--text-secondary)]">
                <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-[var(--error)]" /> Errors</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-[var(--accent)] border-dashed" style={{ borderTop: '1.5px dashed var(--accent)', height: 0 }} /> Duration</span>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <svg width="48" height="48" viewBox="0 0 48 48" className="mx-auto mb-3 text-[var(--text-tertiary)]">
                <line x1="8" y1="40" x2="40" y2="40" stroke="currentColor" strokeWidth="1.5" />
                <line x1="8" y1="8" x2="8" y2="40" stroke="currentColor" strokeWidth="1.5" />
                <polyline points="12,32 20,24 28,28 36,16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3,3" strokeLinecap="round" />
              </svg>
              <p className="text-sm text-[var(--text-secondary)] font-medium">Not enough data yet</p>
              <p className="text-xs text-[var(--text-tertiary)] mt-1">Workers need 3+ sessions to generate a learning curve</p>
              <p className="text-xs text-[var(--text-tertiary)] mt-0.5">Try selecting <button onClick={() => onSelectWorker('Tanaka S.')} className="text-[var(--accent)] hover:underline">Tanaka S.</button> or <button onClick={() => onSelectWorker('Suzuki M.')} className="text-[var(--accent)] hover:underline">Suzuki M.</button></p>
            </div>
          )}
        </div>
      )}

      {/* Competency Matrix — Visual Grid */}
      <div className="bg-[var(--bg-card)] rounded-xl p-5">
        <SectionHeader title="Competency Matrix" description="Skill certification status per worker per task" />
        <div className="overflow-x-auto">
          <div className="grid grid-cols-[auto_1fr_1fr] gap-2 min-w-[400px]">
            {/* Header row */}
            <div />
            <div className="text-xs text-[var(--text-secondary)] text-center uppercase py-1">Paper Airplane</div>
            <div className="text-xs text-[var(--text-secondary)] text-center uppercase py-1">LED Circuit</div>
            {WORKERS.map((w) => {
              const pa = w.certifiedTasks >= 2 ? 'certified' : w.sessions > 5 ? 'in_training' : 'not_started';
              const led = w.certifiedTasks >= 1 ? 'certified' : w.sessions > 3 ? 'in_training' : 'not_started';
              return (
                <CompetencyRow key={w.name} name={w.name} statuses={[pa, led]} />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function CompetencyRow({ name, statuses }: { name: string; statuses: string[] }) {
  return (
    <>
      <div className="text-sm font-medium py-2 pr-4">{name}</div>
      {statuses.map((s, i) => (
        <div key={i} className="flex items-center justify-center py-2">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
            s === 'certified'
              ? 'bg-[var(--success)]/20 border border-[var(--success)]/40'
              : s === 'in_training'
                ? 'bg-[var(--warning)]/10 border border-[var(--warning)]/30'
                : 'border border-dashed border-[var(--border)]'
          }`} title={s === 'certified' ? 'Certified' : s === 'in_training' ? 'In Training' : 'Not Started'}>
            {s === 'certified' && (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
            )}
            {s === 'in_training' && (
              <div className="w-4 h-4 rounded-full border-2 border-[var(--warning)] border-t-transparent animate-spin" style={{ animationDuration: '2s' }} />
            )}
            {s === 'not_started' && (
              <span className="text-[var(--text-tertiary)] text-xs">—</span>
            )}
          </div>
        </div>
      ))}
    </>
  );
}

// ============================================================
// TAB: Voice Insights
// ============================================================

function VoiceTab() {
  const maxQ = VOICE_INSIGHTS.topQuestions[0].count;

  return (
    <div className="space-y-6">
      {/* Voice KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Avg Questions/Session', value: VOICE_INSIGHTS.avgQuestionsPerSession },
          { label: 'Avg AI Corrections', value: VOICE_INSIGHTS.avgCorrectionsPerSession },
          { label: 'Silence Before Action', rawValue: VOICE_INSIGHTS.avgSilenceBeforeAction },
          { label: 'Barge-In Rate', rawValue: `${VOICE_INSIGHTS.bargeInRate}%` },
        ].map((kpi, i) => (
          <div key={i} className="glass-card p-4">
            <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wider mb-1">{kpi.label}</p>
            <span className="text-xl font-bold tabular-nums">{kpi.rawValue ?? kpi.value}</span>
          </div>
        ))}
      </div>

      {/* Top questions - horizontal bar chart */}
      <div className="bg-[var(--bg-card)] rounded-xl p-5">
        <SectionHeader title="Most Common Worker Questions" description="High question frequency reveals which instructions are unclear — prioritize rewording these steps" />
        <div className="space-y-3">
          {VOICE_INSIGHTS.topQuestions.map((q, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">"{q.question}"</p>
                <p className="text-[10px] text-[var(--text-tertiary)]">{q.step}</p>
              </div>
              <div className="w-32 flex items-center gap-2">
                <div className="flex-1 h-4 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(q.count / maxQ) * 100}%`,
                      backgroundColor: `var(--accent)`,
                      opacity: 1 - i * 0.15,
                    }}
                  />
                </div>
                <span className="text-xs font-mono w-6 text-right">{q.count}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Question → FPY correlation with progress rings */}
      <div className="bg-[var(--bg-card)] rounded-xl p-5">
        <SectionHeader title="Question Frequency vs First Pass Yield" description="Workers who engage with the AI coach achieve significantly higher first-pass yields" />
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: '0 questions', fpy: 52, color: 'var(--error)' },
            { label: '1-2 questions', fpy: 68, color: 'var(--warning)' },
            { label: '3+ questions', fpy: 74, color: 'var(--success)' },
          ].map((item) => (
            <div key={item.label} className="flex flex-col items-center bg-[var(--bg-secondary)] rounded-lg p-4">
              <p className="text-xs text-[var(--text-secondary)] mb-3">{item.label}</p>
              <div className="relative">
                <ProgressRing value={item.fpy} size={72} strokeWidth={5} color={item.color} />
                <span className="absolute inset-0 flex items-center justify-center text-lg font-bold tabular-nums">
                  {item.fpy}%
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] mt-2">FPY</p>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-center gap-2 mt-4">
          <svg width="80" height="8" viewBox="0 0 80 8">
            <defs>
              <linearGradient id="corrGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="var(--error)" />
                <stop offset="50%" stopColor="var(--warning)" />
                <stop offset="100%" stopColor="var(--success)" />
              </linearGradient>
            </defs>
            <rect width="80" height="2" y="3" rx="1" fill="url(#corrGrad)" />
            <polygon points="72,0 80,4 72,8" fill="var(--success)" />
          </svg>
          <span className="text-[10px] text-[var(--text-tertiary)]">More engagement = better outcomes</span>
        </div>
        <p className="text-xs text-[var(--text-tertiary)] text-center mt-2">
          This is a metric only GuideSight can track — static instruction platforms have no voice interaction data.
        </p>
      </div>
    </div>
  );
}

// ============================================================
// TAB: Session Log
// ============================================================

function SessionsTab() {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="bg-[var(--bg-card)] rounded-xl p-5">
      <SectionHeader title="Recent Sessions" description="Click a row to view session timeline detail" />
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-[var(--text-secondary)] uppercase">
              <th className="text-left py-2">ID</th>
              <th className="text-left py-2">Worker</th>
              <th className="text-left py-2">Task</th>
              <th className="text-left py-2">Date</th>
              <th className="text-right py-2">Duration</th>
              <th className="text-center py-2">Steps</th>
              <th className="text-right py-2">Errors</th>
              <th className="text-center py-2">FPY</th>
              <th className="text-center py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {RECENT_SESSIONS.map((s) => (
              <>
                <tr
                  key={s.id}
                  className={`border-t border-white/5 cursor-pointer transition-colors ${
                    expandedId === s.id ? 'bg-[var(--accent)]/5' : 'hover:bg-white/[0.03]'
                  }`}
                  onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}
                >
                  <td className="py-2.5 font-mono text-xs text-[var(--text-secondary)]">{s.id}</td>
                  <td className="py-2.5">{s.worker}</td>
                  <td className="py-2.5 text-[var(--text-secondary)]">{s.task}</td>
                  <td className="py-2.5 text-xs text-[var(--text-secondary)]">{s.date}</td>
                  <td className="py-2.5 text-right font-mono">{s.duration}</td>
                  <td className="py-2.5 text-center font-mono">{s.steps}</td>
                  <td className="py-2.5 text-right font-mono">
                    <span className={s.errors === 0 ? 'text-[var(--success)]' : s.errors >= 4 ? 'text-[var(--error)]' : ''}>
                      {s.errors}
                    </span>
                  </td>
                  <td className="py-2.5 text-center">
                    {s.fpy ? (
                      <span className="text-[var(--success)] text-xs font-bold">YES</span>
                    ) : (
                      <span className="text-[var(--text-secondary)] text-xs">no</span>
                    )}
                  </td>
                  <td className="py-2.5 text-center"><StatusDot status={s.status} /></td>
                </tr>
                {expandedId === s.id && (
                  <tr key={`${s.id}-detail`}>
                    <td colSpan={9} className="py-3 px-4 bg-[var(--bg-secondary)]">
                      <SessionTimeline session={s} />
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SessionTimeline({ session }: { session: typeof RECENT_SESSIONS[0] }) {
  const totalSteps = 6;
  const completedSteps = parseInt(session.steps.split('/')[0]);
  // Generate synthetic step detail
  const steps = Array.from({ length: totalSteps }, (_, i) => {
    const stepNum = i + 1;
    const completed = stepNum <= completedSteps;
    const hasError = completed && stepNum <= session.errors && Math.random() > 0.3;
    return { step: stepNum, completed, hasError };
  });

  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-1 mb-2">
        {steps.map((step, i) => (
          <div key={i} className="flex items-center flex-1">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
              step.hasError
                ? 'bg-[var(--error)]/20 text-[var(--error)] border border-[var(--error)]/40'
                : step.completed
                  ? 'bg-[var(--success)]/20 text-[var(--success)] border border-[var(--success)]/40'
                  : 'bg-white/5 text-[var(--text-tertiary)] border border-[var(--border)]'
            }`}>
              {step.step}
            </div>
            {i < totalSteps - 1 && (
              <div className={`flex-1 h-px mx-1 ${step.completed ? 'bg-[var(--success)]/30' : 'bg-[var(--border)]'}`} />
            )}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-4 text-[10px] text-[var(--text-tertiary)]">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[var(--success)]/40" /> Completed</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[var(--error)]/40" /> Error</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-white/10" /> Not reached</span>
        <span className="ml-auto">Duration: {session.duration}</span>
      </div>
    </div>
  );
}
