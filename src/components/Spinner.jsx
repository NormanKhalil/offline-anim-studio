import { Loader2 } from 'lucide-react';

export default function Spinner({ size = 20, label = '', className = '' }) {
  return (
    <span role="status" className={`inline-flex items-center ${className}`}>
      <Loader2 size={size} className="animate-spin" aria-hidden="true" />
      <span className="sr-only">{label || 'Loading'}</span>
    </span>
  );
}

export function PageLoader({ label = 'Loading…' }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-slate-500 dark:text-slate-400">
      <Spinner size={32} label={label} />
      <p className="text-sm" aria-hidden="true">{label}</p>
    </div>
  );
}
