import { useId } from 'react';

export default function SegmentedControl({ label, options, value, onChange, className = '' }) {
  const name = useId();
  return (
    <fieldset className={className}>
      <legend className="mb-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">{label}</legend>
      <div className="flex gap-1 rounded-xl border border-slate-300 bg-slate-100 p-1 dark:border-slate-700 dark:bg-slate-950">
        {options.map((o) => (
          <label key={o.value} className="flex-1">
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
              className="peer sr-only"
            />
            <span className="block cursor-pointer rounded-lg px-2 py-2 text-center text-sm font-medium text-slate-600 transition peer-checked:bg-white peer-checked:text-violet-700 peer-checked:shadow peer-focus-visible:ring-2 peer-focus-visible:ring-violet-500 dark:text-slate-400 dark:peer-checked:bg-slate-800 dark:peer-checked:text-violet-300">
              {o.label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
