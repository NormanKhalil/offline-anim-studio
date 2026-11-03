import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Lock, Mail, User } from 'lucide-react';
import AuthShell from '../components/AuthShell.jsx';
import Input from '../components/Input.jsx';
import Button from '../components/Button.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import useDocumentTitle from '../hooks/useDocumentTitle.js';
import { validateSignup } from '../utils/validators.js';

export default function Signup() {
  useDocumentTitle('Create account');
  const { signup } = useAuth();
  const [values, setValues] = useState({ name: '', email: '', password: '', confirm: '' });
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
    const errs = validateSignup(values);
    setErrors(errs);
    setFormError('');
    if (Object.keys(errs).length) return;
    setSubmitting(true);
    try {
      await signup(values);
    } catch (err) {
      if (mounted.current) {
        setFormError(err.message);
        setSubmitting(false);
      }
    }
  };

  return (
    <AuthShell
      title="Create your account"
      subtitle="Your account lives only on this device."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-violet-600 hover:underline dark:text-violet-400">
            Sign in
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
        <Input label="Full name" autoComplete="name" icon={User} value={values.name} onChange={set('name')} error={errors.name} placeholder="Your name" />
        <Input label="Email" type="email" autoComplete="email" icon={Mail} value={values.email} onChange={set('email')} error={errors.email} placeholder="you@example.com" />
        <Input label="Password" type="password" autoComplete="new-password" icon={Lock} value={values.password} onChange={set('password')} error={errors.password} hint="At least 6 characters." />
        <Input label="Confirm password" type="password" autoComplete="new-password" icon={Lock} value={values.confirm} onChange={set('confirm')} error={errors.confirm} />
        <Button type="submit" loading={submitting} className="w-full" size="lg">
          Create account
        </Button>
      </form>
    </AuthShell>
  );
}
