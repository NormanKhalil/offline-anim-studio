import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Film, HardDrive, Plus, Trash2, Video } from 'lucide-react';
import Card from '../components/Card.jsx';
import Button, { buttonClasses } from '../components/Button.jsx';
import Modal from '../components/Modal.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { StatusBadge } from '../components/Badge.jsx';
import { PageLoader } from '../components/Spinner.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import useAsync from '../hooks/useAsync.js';
import useDocumentTitle from '../hooks/useDocumentTitle.js';
import { deleteProject, getStorageUsage, listProjects } from '../api/api.js';
import { formatBytes, formatDate } from '../utils/format.js';
import { LANGUAGES, labelOf } from '../utils/constants.js';

function Stat({ icon: Icon, label, value }) {
  return (
    <div className="surface flex items-center gap-4 p-5">
      <div className="gradient-bg rounded-xl p-2.5 text-white">
        <Icon size={20} aria-hidden="true" />
      </div>
      <div>
        <p className="text-2xl font-bold leading-tight">{value}</p>
        <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
      </div>
    </div>
  );
}

function ProjectCard({ project, onDelete }) {
  const openPath = project.status === 'generating' ? `/generate/${project.id}` : `/project/${project.id}`;
  return (
    <article className="surface flex flex-col overflow-hidden">
      <div className="relative aspect-video bg-slate-200 dark:bg-slate-800">
        {project.thumbnail ? (
          <img src={project.thumbnail} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-slate-400">
            <Video size={32} aria-hidden="true" />
          </div>
        )}
        <div className="absolute right-2 top-2">
          <StatusBadge status={project.status} />
        </div>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="truncate font-semibold" title={project.title}>
          {project.title}
        </h3>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {labelOf(LANGUAGES, project.language).split(' ')[0]} · {project.resolution} ·{' '}
          {project.orientation === 'portrait' ? '9:16' : '16:9'}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400">Created {formatDate(project.createdAt)}</p>
        <div className="mt-4 flex gap-2">
          <Link to={openPath} className={buttonClasses('primary', 'sm', 'flex-1')}>
            Open
          </Link>
          <Button variant="secondary" size="sm" icon={Trash2} onClick={() => onDelete(project)} aria-label={`Delete ${project.title}`}>
            Delete
          </Button>
        </div>
      </div>
    </article>
  );
}

export default function Dashboard() {
  useDocumentTitle('Dashboard');
  const { user } = useAuth();
  const toast = useToast();
  const { data, loading, error, reload } = useAsync(async () => {
    const [projects, usage] = await Promise.all([listProjects(), getStorageUsage()]);
    return { projects, usage };
  }, []);
  const [target, setTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const confirmDelete = async () => {
    if (!target) return;
    setDeleting(true);
    try {
      await deleteProject(target.id);
      toast.success(`“${target.title}” was deleted.`);
      setTarget(null);
      reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const header = (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold">Welcome back, {user.name.split(' ')[0]}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Your projects are stored privately on this device.</p>
      </div>
      <Link to="/create" className={buttonClasses('primary', 'md')}>
        <Plus size={16} aria-hidden="true" />
        New Video
      </Link>
    </div>
  );

  if (loading && !data) return <>{header}<PageLoader label="Loading your projects…" /></>;
  if (error && !data) {
    return (
      <>
        {header}
        <EmptyState
          icon={AlertTriangle}
          title="Couldn’t load your projects"
          description={error}
          action={<Button onClick={reload}>Try again</Button>}
        />
      </>
    );
  }

  const projects = data.projects;
  const completed = projects.filter((p) => p.status === 'completed').length;

  return (
    <>
      {header}
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <Stat icon={Film} label="Total projects" value={projects.length} />
        <Stat icon={CheckCircle2} label="Completed videos" value={completed} />
        <Stat icon={HardDrive} label="Storage used" value={formatBytes(data.usage.used)} />
      </div>

      {projects.length === 0 ? (
        <EmptyState
          icon={Video}
          title="No videos yet"
          description="Add a script and two or three character images to generate your first animated video."
          action={
            <Link to="/create" className={buttonClasses('primary', 'md')}>
              <Plus size={16} aria-hidden="true" />
              Create your first video
            </Link>
          }
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <ProjectCard key={p.id} project={p} onDelete={setTarget} />
          ))}
        </div>
      )}

      <Modal
        open={Boolean(target)}
        onClose={() => !deleting && setTarget(null)}
        title="Delete this project?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setTarget(null)} disabled={deleting}>
              Keep project
            </Button>
            <Button variant="danger" loading={deleting} onClick={confirmDelete}>
              Delete project
            </Button>
          </>
        }
      >
        <p>
          “{target && target.title}” and its generated video will be permanently removed from this device.
        </p>
      </Modal>
    </>
  );
}
