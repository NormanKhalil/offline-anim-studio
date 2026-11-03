import Logo from './Logo.jsx';
import OfflineBanner from './OfflineBanner.jsx';

export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="flex min-h-screen flex-col">
      <OfflineBanner />
      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="mb-8 flex justify-center">
            <Logo size="lg" />
          </div>
          <div className="surface p-6 sm:p-8">
            <h1 className="text-xl font-semibold">{title}</h1>
            <p className="mb-6 mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
            {children}
          </div>
          <p className="mt-5 text-center text-sm text-slate-500 dark:text-slate-400">{footer}</p>
        </div>
      </main>
    </div>
  );
}
