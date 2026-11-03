import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Lock, Mail } from 'lucide-react';
import AuthShell from '../components/AuthShell.jsx';
import Input from '../components/Input.jsx';
import Button from '../components/Button.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import useDocumentTitle from '../hooks/useDocumentTitle.js';
import { validateLogin } from '../utils/validators.js';

export default function Login() {
  useDocumentTitle('Sign in');
  const { login } = useAuth();
  const [values, setValues] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const set = (field) => (e) => setValues((v) => ({ ...v, [field]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    const errs = validateLogin(values);
    setErrors(errs);
    setFormError('');
    if (Object.keys(errs).length) return;
    setSubmitting(true);
    try {
      await login(values);
      // PublicOnlyRoute redirects automatically once the user is set.
    } catch (err) {
      if (mounted.current) {
        setFormError(err.message);
        setSubmitting(false);
      }
    }
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to continue creating videos."
      footer={
        <>
          New here?{' '}
          <Link to="/signup" className="font-medium text-violet-600 hover:underline dark:text-violet-400">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {formError && (
          <div role="alert" className="flex items-start gap-2 rounded-xl bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-400">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
            {formError}
          </div>
        )}
        <Input label="Email" type="email" autoComplete="email" icon={Mail} value={values.email} onChange={set('email')} error={errors.email} placeholder="you@example.com" />
        <Input label="Password" type="password" autoComplete="current-password" icon={Lock} value={values.password} onChange={set('password')} error={errors.password} placeholder="Your password" />
        <Button type="submit" loading={submitting} className="w-full" size="lg">
          Sign in
        </Button>
      </form>
    </AuthShell>
  );
}
