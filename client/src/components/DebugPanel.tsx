import { useState, useEffect, useRef } from 'react';
import { useCall } from '@stream-io/video-react-sdk';

interface DebugEntry {
  id: number;
  timestamp: string;
  source: 'gemini' | 'claude' | 'cv' | 'system';
  type: string;
  message: string;
  detail?: string;
  status?: 'success' | 'error' | 'info' | 'pending';
}

const SOURCE_COLORS: Record<string, { bg: string; border: string; text: string; label: string }> = {
  gemini: { bg: 'rgba(52, 168, 83, 0.1)', border: '#34a853', text: '#4ade80', label: 'GEMINI' },
  claude: { bg: 'rgba(212, 165, 116, 0.1)', border: '#d4a574', text: '#e8c49a', label: 'CLAUDE' },
  cv: { bg: 'rgba(108, 99, 255, 0.1)', border: '#6c63ff', text: '#b8b0ff', label: 'CV GLASSES' },
  system: { bg: 'rgba(136, 136, 160, 0.1)', border: '#555', text: '#8888a0', label: 'SYSTEM' },
};

export function DebugPanel() {
  const [entries, setEntries] = useState<DebugEntry[]>([]);
  const [collapsed, setCollapsed] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const idRef = useRef(0);
  const call = useCall();

  const addEntry = (entry: Omit<DebugEntry, 'id' | 'timestamp'>) => {
    const now = new Date();
    const ts = `${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    setEntries((prev) => {
      const next = [...prev, { ...entry, id: ++idRef.current, timestamp: ts }];
      return next.slice(-80); // Keep last 80 entries
    });
  };

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries]);

  // Listen for debug custom events from agent
  useEffect(() => {
    if (!call) return;

    const unsubscribe = call.on('custom', (event: any) => {
      const data = event.custom;
      if (!data?.type) return;

      switch (data.type) {
        case 'debug_gemini_action':
          addEntry({
            source: 'gemini',
            type: data.action || 'action',
            message: data.message || '',
            detail: data.detail,
            status: data.status || 'info',
          });
          break;

        case 'claude_verification':
          addEntry({
            source: 'claude',
            type: 'verify',
            message: data.verified
              ? `Step ${data.step} VERIFIED`
              : `Step ${data.step} REJECTED`,
            detail: data.reason,
            status: data.verified ? 'success' : 'error',
          });
          break;

        case 'debug_claude_prompt':
          addEntry({
            source: 'claude',
            type: 'prompt',
            message: `Verifying step ${data.step}...`,
            detail: data.visual_cue,
            status: 'pending',
          });
          break;

        case 'debug_cv_detection':
          addEntry({
            source: 'cv',
            type: 'detect',
            message: data.state || 'detection',
            detail: data.detail,
            status: 'info',
          });
          break;

        case 'step_complete':
          addEntry({
            source: 'system',
            type: 'step',
            message: `Step ${data.step} complete → now step ${data.current_step}`,
            status: 'success',
          });
          break;

        case 'step_regression':
          addEntry({
            source: 'system',
            type: 'regression',
            message: `Regressed: step ${data.from_step} → ${data.to_step}`,
            status: 'error',
          });
          break;

        case 'error_flagged':
          addEntry({
            source: 'gemini',
            type: 'error',
            message: `Error at step ${data.step}: ${data.error_type}`,
            detail: data.description,
            status: 'error',
          });
          break;
      }
    });

    return () => { unsubscribe(); };
  }, [call]);

  // Add initial entry
  useEffect(() => {
    addEntry({
      source: 'system',
      type: 'init',
      message: 'Debug panel active — watching AI pipeline',
      status: 'info',
    });
  }, []);

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="fixed left-0 top-1/2 -translate-y-1/2 z-50 bg-[#1a1a24] border border-[#3a3a4a] rounded-r-lg px-2 py-4 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        style={{ writingMode: 'vertical-rl' }}
      >
        AI Debug Panel
      </button>
    );
  }

  return (
    <div className="fixed left-0 top-0 bottom-0 w-[340px] z-50 flex flex-col bg-[#0c0c12] border-r border-[#2a2a3a]">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#2a2a3a] bg-[#111118]">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs font-semibold text-[var(--text-primary)] tracking-wide">
            AI PIPELINE MONITOR
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setEntries([])}
            className="text-[10px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-1"
          >
            Clear
          </button>
          <button
            onClick={() => setCollapsed(true)}
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-sm px-1"
          >
            ×
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-3 px-3 py-1.5 border-b border-[#2a2a3a] bg-[#0f0f16]">
        {Object.entries(SOURCE_COLORS).map(([key, val]) => (
          <div key={key} className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full" style={{ background: val.border }} />
            <span className="text-[9px] font-medium" style={{ color: val.text }}>{val.label}</span>
          </div>
        ))}
      </div>

      {/* Scrolling log */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-2 py-1 space-y-1">
        {entries.map((entry) => {
          const colors = SOURCE_COLORS[entry.source];
          return (
            <div
              key={entry.id}
              className="rounded-md px-2 py-1.5 text-[11px] leading-tight"
              style={{
                background: colors.bg,
                borderLeft: `3px solid ${colors.border}`,
              }}
            >
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-[9px] font-mono text-[var(--text-secondary)]">
                  {entry.timestamp}
                </span>
                <span
                  className="text-[9px] font-bold tracking-wider"
                  style={{ color: colors.text }}
                >
                  {colors.label}
                </span>
                <span className="text-[9px] text-[var(--text-secondary)]">
                  {entry.type}
                </span>
                {entry.status === 'success' && (
                  <span className="text-[9px] text-green-400">✓</span>
                )}
                {entry.status === 'error' && (
                  <span className="text-[9px] text-red-400">✗</span>
                )}
                {entry.status === 'pending' && (
                  <span className="text-[9px] text-yellow-400">⟳</span>
                )}
              </div>
              <div className="text-[var(--text-primary)]">{entry.message}</div>
              {entry.detail && (
                <div className="text-[10px] text-[var(--text-secondary)] mt-0.5 italic">
                  {entry.detail}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer stats */}
      <div className="px-3 py-1.5 border-t border-[#2a2a3a] bg-[#0f0f16] text-[9px] text-[var(--text-secondary)] flex justify-between">
        <span>{entries.length} events</span>
        <span>Gemini coaches · Claude verifies</span>
      </div>
    </div>
  );
}
