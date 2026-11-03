import { AlertTriangle, CheckCircle2, Circle, Loader2 } from 'lucide-react';
import ProgressBar from './ProgressBar.jsx';

const LABELS = { pending: 'Pending', running: 'Running', done: 'Done', error: 'Failed' };

export default function Stepper({ stages }) {
  return (
    <ol className="space-y-3">
      {stages.map((s, i) => {
        const Icon = s.status === 'done' ? CheckCircle2 : s.status === 'running' ? Loader2 : s.status === 'error' ? AlertTriangle : Circle;
        const color =
          s.status === 'done'
            ? 'text-emerald-500'
            : s.status === 'running'
            ? 'text-violet-500'
            : s.status === 'error'
            ? 'text-red-500'
            : 'text-slate-400';
        return (
          <li
            key={s.key}
            aria-current={s.status === 'running' ? 'step' : undefined}
            className={`rounded-xl border p-3 transition ${
              s.status === 'running'
                ? 'border-violet-500/60 bg-violet-500/5'
                : 'border-slate-200 dark:border-slate-800'
            }`}
          >
            <div className="flex items-start gap-3">
              <Icon
                size={20}
                aria-hidden="true"
                className={`mt-0.5 shrink-0 ${color} ${s.status === 'running' ? 'animate-spin' : ''}`}
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium">
                    {i + 1}. {s.title}
                  </p>
                  <span className={`text-xs font-medium ${color}`}>{LABELS[s.status]}</span>
                </div>
                <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">{s.description}</p>
                <ProgressBar
                  value={s.progress}
                  size="sm"
                  label={`${s.title} progress`}
                  tone={s.status === 'done' ? 'success' : s.status === 'error' ? 'danger' : 'accent'}
                />
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
