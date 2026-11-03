import { useId } from 'react';

export const fieldClasses =
  'w-full rounded-xl border bg-white px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition dark:bg-slate-950 dark:text-slate-100 dark:placeholder-slate-500';

export default function Input({
  label,
  error,
  hint,
  multiline = false,
  icon: Icon,
  rightSlot,
  className = '',
  inputClassName = '',
  id,
  ...rest
}) {
  const autoId = useId();
  const inputId = id || autoId;
  const descId = `${inputId}-desc`;
  const Tag = multiline ? 'textarea' : 'input';
  return (
    <div className={className}>
      {label && (
        <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <Icon
            size={16}
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
        )}
        <Tag
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || hint ? descId : undefined}
          className={`${fieldClasses} ${error ? 'border-red-500' : 'border-slate-300 dark:border-slate-700'} ${
            Icon ? 'pl-9' : ''
          } ${rightSlot ? 'pr-10' : ''} ${inputClassName}`}
          {...rest}
        />
        {rightSlot && <div className="absolute right-2 top-1/2 -translate-y-1/2">{rightSlot}</div>}
      </div>
      {error ? (
        <p id={descId} role="alert" className="mt-1.5 text-xs text-red-500">
          {error}
        </p>
      ) : hint ? (
        <p id={descId} className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
