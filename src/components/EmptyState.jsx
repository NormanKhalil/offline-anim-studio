export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="surface flex flex-col items-center px-6 py-14 text-center">
      {Icon && (
        <div className="gradient-bg mb-4 rounded-2xl p-3 text-white">
          <Icon size={28} aria-hidden="true" />
        </div>
      )}
      <h2 className="text-lg font-semibold">{title}</h2>
      {description && <p className="mt-1 max-w-md text-sm text-slate-500 dark:text-slate-400">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
