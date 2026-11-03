const TONES = {
  neutral: 'bg-slate-500/15 text-slate-600 dark:text-slate-300',
  success: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  info: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
  warning: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  danger: 'bg-red-500/15 text-red-600 dark:text-red-400',
  accent: 'bg-violet-500/15 text-violet-600 dark:text-violet-300',
};

export default function Badge({ tone = 'neutral', children, className = '' }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${TONES[tone]} ${className}`}>
      {children}
    </span>
  );
}

const STATUS = {
  draft: { tone: 'neutral', label: 'Draft' },
  generating: { tone: 'info', label: 'Generating' },
  completed: { tone: 'success', label: 'Completed' },
  failed: { tone: 'danger', label: 'Failed' },
  cancelled: { tone: 'warning', label: 'Cancelled' },
};

export function StatusBadge({ status }) {
  const s = STATUS[status] || STATUS.draft;
  return <Badge tone={s.tone}>{s.label}</Badge>;
}
