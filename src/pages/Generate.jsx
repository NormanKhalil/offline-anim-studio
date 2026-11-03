import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, RefreshCw, Square, Terminal } from 'lucide-react';
import Card from '../components/Card.jsx';
import Button, { buttonClasses } from '../components/Button.jsx';
import Stepper from '../components/Stepper.jsx';
import ProgressBar from '../components/ProgressBar.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { useToast } from '../context/ToastContext.jsx';
import useDocumentTitle from '../hooks/useDocumentTitle.js';
import { STAGES, cancelGeneration, getProject, startGeneration } from '../api/api.js';
import { GenerationCancelled } from '../utils/videoGenerator.js';
import { formatClock } from '../utils/format.js';

const PENDING_STAGES = STAGES.map((s) => ({
  key: s.key,
  title: s.title,
  description: s.description,
  status: 'pending',
  progress: 0,
}));

export default function Generate() {
  useDocumentTitle('Generating video');
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [project, setProject] = useState(null);
  const [run, setRun] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [cancelling, setCancelling] = useState(false);
  const [now, setNow] = useState(Date.now());
  const logRef = useRef(null);

  useEffect(() => {
    let active = true;
    let redirectTimer = null;
    setRun(null);
    setLoadError('');
    setCancelling(false);

    (async () => {
      try {
        const p = await getProject(id);
        if (!active) return;
        setProject(p);
        if (p.status === 'completed') {
          navigate(`/project/${id}`, { replace: true });
          return;
        }
        await startGeneration(id, (state) => {
          if (active) setRun(state);
        });
        if (!active) return;
        toast.success('Your video is ready!');
        redirectTimer = setTimeout(() => navigate(`/project/${id}`, { replace: true }), 900);
      } catch (err) {
        if (!active || err instanceof GenerationCancelled) return;
        setLoadError(err.message || 'Something went wrong.');
      }
    })();

    return () => {
      active = false;
      if (redirectTimer) clearTimeout(redirectTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, attempt]);

  useEffect(() => {
    if (!run || run.status !== 'running') return undefined;
    const timer = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(timer);
  }, [run && run.status]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [run && run.logs.length]);

  const handleCancel = async () => {
    setCancelling(true);
    try {
      await cancelGeneration(id);
    } finally {
      setCancelling(false);
    }
  };

  const status = run ? run.status : 'running';
  const failed = status === 'failed' || (!run && loadError);
  const errorMessage = (run && run.error) || loadError;

  if (!run && loadError) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Can’t start generation"
        description={loadError}
        action={
          <Link to="/dashboard" className={buttonClasses('primary', 'md')}>
            Back to dashboard
          </Link>
        }
      />
    );
  }

  const stages = run ? run.stages : PENDING_STAGES;
  const overall = run ? run.overall : 0;
  const elapsed = run ? ((run.finishedAt || now) - run.startedAt) / 1000 : 0;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{status === 'completed' ? 'Video ready' : 'Generating your video'}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{project ? project.title : 'Preparing…'}</p>
        </div>
        {status === 'running' && (
          <Button variant="danger" icon={Square} onClick={handleCancel} loading={cancelling} disabled={!run}>
            Cancel
          </Button>
        )}
      </div>

      {status === 'cancelled' && (
        <div role="status" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-400">
          <span>Generation was cancelled. Nothing was saved for this video.</span>
          <span className="flex gap-2">
            <Button size="sm" icon={RefreshCw} onClick={() => setAttempt((a) => a + 1)}>
              Start again
            </Button>
            <Link to="/dashboard" className={buttonClasses('secondary', 'sm')}>
              <ArrowLeft size={14} aria-hidden="true" />
              Dashboard
            </Link>
          </span>
        </div>
      )}

      {failed && (
        <div role="alert" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-400">
          <span className="min-w-0 flex-1">{errorMessage || 'Generation failed.'}</span>
          <span className="flex gap-2">
            <Button size="sm" icon={RefreshCw} onClick={() => setAttempt((a) => a + 1)}>
              Try again
            </Button>
            <Link to="/dashboard" className={buttonClasses('secondary', 'sm')}>
              Dashboard
            </Link>
          </span>
        </div>
      )}

      <Card className="mb-6">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-3xl font-bold">{overall}%</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">Overall progress</p>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400" aria-live="off">
            Elapsed <span className="font-mono font-medium text-slate-800 dark:text-slate-100">{formatClock(elapsed)}</span>
          </p>
        </div>
        <ProgressBar value={overall} size="lg" label="Overall progress" tone={status === 'completed' ? 'success' : failed ? 'danger' : 'accent'} />
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Pipeline">
          <Stepper stages={stages} />
        </Card>
        <Card title="Log console" action={<Terminal size={16} className="text-slate-400" aria-hidden="true" />}>
          <div
            ref={logRef}
            role="log"
            aria-label="Generation log"
            className="h-80 overflow-y-auto rounded-xl bg-slate-950 p-3 font-mono text-xs leading-relaxed text-slate-300"
          >
            {run && run.logs.length ? (
              run.logs.map((l) => (
                <p key={l.id}>
                  <span className="text-slate-500">[{l.time}]</span> {l.message}
                </p>
              ))
            ) : (
              <p className="text-slate-500">Waiting to start…</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
