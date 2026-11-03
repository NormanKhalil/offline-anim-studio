export default function ProgressBar({ value = 0, label, size = 'md', tone = 'accent', showValue = false }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  const height = size === 'sm' ? 'h-1.5' : size === 'lg' ? 'h-3' : 'h-2';
  const fill =
    tone === 'success' ? 'bg-emerald-500' : tone === 'danger' ? 'bg-red-500' : 'gradient-bg';
  return (
    <div>
      {(label || showValue) && (
        <div className="mb-1 flex justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>{label}</span>
          {showValue && <span>{pct}%</span>}
        </div>
      )}
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label={label || 'Progress'}
        className={`w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800 ${height}`}
      >
        <div className={`${height} rounded-full transition-all duration-200 ${fill}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
