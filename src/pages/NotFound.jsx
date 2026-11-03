import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { buttonClasses } from '../components/Button.jsx';
import useDocumentTitle from '../hooks/useDocumentTitle.js';

export default function NotFound() {
  useDocumentTitle('Page not found');
  const { user } = useAuth();
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <div className="gradient-bg mb-5 rounded-2xl p-4 text-white">
        <Compass size={36} aria-hidden="true" />
      </div>
      <p className="gradient-text text-6xl font-bold">404</p>
      <h1 className="mt-2 text-xl font-semibold">This page doesn’t exist</h1>
      <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">
        The link may be broken, or the page was moved.
      </p>
      <Link to={user ? '/dashboard' : '/login'} className={buttonClasses('primary', 'md', 'mt-6')}>
        {user ? 'Back to dashboard' : 'Go to sign in'}
      </Link>
    </main>
  );
}
