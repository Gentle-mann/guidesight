import type { CvTool } from '../cvTools';
import { getCvTools, CV_TOOLS } from '../cvTools';

interface CvToolIconProps {
  tool: CvTool;
  size?: number;
}

/** Single tool icon with tooltip-ready title */
function CvToolIcon({ tool, size = 18 }: CvToolIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={tool.color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={tool.iconPath} />
    </svg>
  );
}

interface CvToolBadgeProps {
  tool: CvTool;
  size?: 'sm' | 'md';
  showLabel?: boolean;
}

/** A single CV tool badge — icon + optional label */
export function CvToolBadge({ tool, size = 'sm', showLabel = true }: CvToolBadgeProps) {
  const iconSize = size === 'sm' ? 14 : 18;
  const statusDot = tool.status === 'implemented'
    ? 'bg-[var(--success)]'
    : tool.status === 'planned'
      ? 'bg-[var(--warning)]'
      : 'bg-[var(--text-secondary)]';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-white/10 ${
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
      }`}
      style={{ backgroundColor: `${tool.color}15` }}
      title={`${tool.name}: ${tool.description} (${tool.status})`}
    >
      <CvToolIcon tool={tool} size={iconSize} />
      {showLabel && (
        <span style={{ color: tool.color }} className="font-medium">
          {tool.shortName}
        </span>
      )}
      <span className={`w-1.5 h-1.5 rounded-full ${statusDot}`} />
    </span>
  );
}

interface CvToolBarProps {
  toolIds: string[];
  size?: 'sm' | 'md';
  showLabel?: boolean;
  maxVisible?: number;
}

/** A row of CV tool badges for a task */
export function CvToolBar({ toolIds, size = 'sm', showLabel = true, maxVisible }: CvToolBarProps) {
  const tools = getCvTools(toolIds);
  if (tools.length === 0) return null;

  const visible = maxVisible ? tools.slice(0, maxVisible) : tools;
  const overflow = maxVisible ? tools.length - maxVisible : 0;

  return (
    <div className="flex flex-wrap gap-1.5">
      {visible.map((tool) => (
        <CvToolBadge key={tool.id} tool={tool} size={size} showLabel={showLabel} />
      ))}
      {overflow > 0 && (
        <span className="inline-flex items-center px-2 py-0.5 text-xs text-[var(--text-secondary)] bg-white/5 rounded-full">
          +{overflow}
        </span>
      )}
    </div>
  );
}

interface CvToolPickerProps {
  selected: string[];
  onChange: (ids: string[]) => void;
}

/** Multi-select grid for choosing CV tools when editing a task */
export function CvToolPicker({ selected, onChange }: CvToolPickerProps) {
  const toggle = (id: string) => {
    onChange(
      selected.includes(id)
        ? selected.filter((s) => s !== id)
        : [...selected, id],
    );
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {CV_TOOLS.map((tool) => {
        const active = selected.includes(tool.id);
        return (
          <button
            key={tool.id}
            type="button"
            onClick={() => toggle(tool.id)}
            className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-left transition-all border ${
              active
                ? 'border-[var(--accent)] bg-[var(--accent)]/10'
                : 'border-transparent bg-[var(--bg-secondary)] hover:bg-[var(--bg-card)]'
            }`}
          >
            <CvToolIcon tool={tool} size={20} />
            <div className="min-w-0 flex-1">
              <p className={`text-sm font-medium truncate ${active ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
                {tool.name}
              </p>
              <p className="text-xs text-[var(--text-secondary)] truncate">{tool.status}</p>
            </div>
            {active && (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </button>
        );
      })}
    </div>
  );
}
