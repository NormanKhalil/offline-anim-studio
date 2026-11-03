import { useId } from 'react';
import { fieldClasses } from './Input.jsx';

export default function Select({ label, options, className = '', id, hint, ...rest }) {
  const autoId = useId();
  const selectId = id || autoId;
  return (
    <div className={className}>
      {label && (
        <label htmlFor={selectId} className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
          {label}
        </label>
      )}
      <select
        id={selectId}
        aria-describedby={hint ? `${selectId}-hint` : undefined}
        className={`${fieldClasses} border-slate-300 dark:border-slate-700`}
        {...rest}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {hint && (
        <p id={`${selectId}-hint`} className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
          {hint}
        </p>
      )}
    </div>
  );
}
