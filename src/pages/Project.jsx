import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, Download, Film, Play, RefreshCw, Trash2 } from 'lucide-react';
import Card from '../components/Card.jsx';
import Button, { buttonClasses } from '../components/Button.jsx';
import Modal from '../components/Modal.jsx';
import Badge, { StatusBadge } from '../components/Badge.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { PageLoader } from '../components/Spinner.jsx';
import { useToast } from '../context/ToastContext.jsx';
import useAsync from '../hooks/useAsync.js';
import useDocumentTitle from '../hooks/useDocumentTitle.js';
import { deleteProject, getProject, getProjectVideo, resetProject } from '../api/api.js';
import { formatBytes, formatClock, formatDate, slugify } from '../utils/format.js';
import { LANGUAGES, MUSIC, VOICES, labelOf } from '../utils/constants.js';

function Detail({ label, value }) {
  return (
    <div className="flex justify-between gap-3 border-b border-slate-100 py-2 text-sm last:border-0 dark:border-slate-800">
      <dt className="text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}

export default function Project() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const videoRef = useRef(null);
  const { data, loading, error, reload } = useAsync(async () => {
    const project = await getProject(id);
    const video = project.status === 'completed' ? await getProjectVideo(id) : null;
    return { project, video };
  }, [id]);
  const [videoUrl, setVideoUrl] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState('');

  useDocumentTitle(data ? data.project.title : 'Project');

  useEffect(() => {
    if (!data || !data.video) {
      setVideoUrl(null);
      return undefined;
    }
    const url = URL.createObjectURL(data.video);
    setVideoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [data]);

  if (loading && !data) return <PageLoader label="Loading project…" />;
  if (error && !data) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Project not available"
        description={error}
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={reload}>
              Try again
            </Button>
            <Link to="/dashboard" className={buttonClasses('primary', 'md')}>
              Back to dashboard
            </Link>
          </div>
        }
      />
    );
  }

  const { project } = data;
  const portrait = project.orientation === 'portrait';
  const ext = project.videoExt || 'webm';

  const fixDuration = () => {
    // MediaRecorder files often report an infinite duration until the end is seeked once.
    const v = videoRef.current;
    if (v && v.duration === Infinity) {
      v.currentTime = 1e101;
      const reset = () => {
        v.removeEventListener('timeupdate', reset);
        v.currentTime = 0;
      };
      v.addEventListener('timeupdate', reset);
    }
  };

  const seek = (time) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = time;
    v.play().catch(() => {});
  };

  const regenerate = async () => {
    setBusy('regen');
    try {
      await resetProject(id);
      navigate(`/generate/${id}`);
    } catch (err) {
      toast.error(err.message);
      setBusy('');
    }
  };

  const remove = async () => {
    setBusy('delete');
    try {
      await deleteProject(id);
      toast.success('Project deleted.');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      toast.error(err.message);
      setBusy('');
      setConfirmDelete(false);
    }
  };

  let player;
  if (project.status === 'completed' && videoUrl) {
    player = (
      <div className={`mx-auto overflow-hidden rounded-xl bg-black ${portrait ? 'max-w-xs' : 'w-full'}`} style={{ aspectRatio: portrait ? '9 / 16' : '16 / 9' }}>
        <video
          ref={videoRef}
          src={videoUrl}
          controls
          playsInline
          preload="metadata"
          onLoadedMetadata={fixDuration}
          className="h-full w-full"
        >
          Your browser can’t play this video.
        </video>
      </div>
    );
  } else if (project.status === 'completed') {
    player = (
      <EmptyState
        icon={AlertTriangle}
        title="Video file not found"
        description="The generated video is missing from local storage. Regenerate it to create a new one."
      />
    );
  } else if (project.status === 'generating') {
    player = (
      <EmptyState
        icon={Film}
        title="Still generating"
        description="This video is being created right now."
        action={
          <Link to={`/generate/${id}`} className={buttonClasses('primary', 'md')}>
            View progress
          </Link>
        }
      />
    );
  } else {
    player = (
      <EmptyState
        icon={Film}
        title={project.status === 'failed' ? 'Generation failed' : 'No video yet'}
        description={project.error || 'Generate the video to preview and download it here.'}
        action={
          <Link to={`/generate/${id}`} className={buttonClasses('primary', 'md')}>
            <Play size={16} aria-hidden="true" />
            Generate video
          </Link>
        }
      />
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold">{project.title}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <StatusBadge status={project.status} />
            <span>Created {formatDate(project.createdAt)}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {videoUrl && (
            <a href={videoUrl} download={`${slugify(project.title)}.${ext}`} className={buttonClasses('primary', 'md')}>
              <Download size={16} aria-hidden="true" />
              Download {ext.toUpperCase()}
            </a>
          )}
          <Button variant="secondary" icon={RefreshCw} onClick={regenerate} loading={busy === 'regen'}>
            Regenerate
          </Button>
          <Button variant="danger" icon={Trash2} onClick={() => setConfirmDelete(true)}>
            Delete
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          <Card title="Preview">
            {player}
            {videoUrl && ext === 'webm' && (
              <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                Your browser records WebM instead of MP4, so the download is saved as .webm.
              </p>
            )}
          </Card>

          <Card title="Scene breakdown" description={`${project.scenes.length} scenes · click a scene to jump to it`}>
            <ol className="space-y-2">
              {project.scenes.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => seek(s.start)}
                    disabled={!videoUrl}
                    className="flex w-full items-start gap-3 rounded-xl border border-slate-200 p-3 text-left transition enabled:hover:border-violet-400 disabled:cursor-default dark:border-slate-800"
                  >
                    <span className="mt-0.5 shrink-0 rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs dark:bg-slate-800">
                      {formatClock(s.start)}–{formatClock(s.end)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm" dir={project.language === 'urdu' ? 'rtl' : 'ltr'}>
                        {s.text}
                      </span>
                      <span className="mt-1.5 flex flex-wrap gap-1.5">
                        <Badge tone="accent">{project.characters[s.characterIndex % project.characters.length].name}</Badge>
                        <Badge>{s.animation}</Badge>
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card title="Details">
            <dl>
              <Detail label="Language" value={labelOf(LANGUAGES, project.language)} />
              <Detail label="Voice style" value={labelOf(VOICES, project.voice)} />
              <Detail label="Music" value={labelOf(MUSIC, project.music)} />
              <Detail label="Resolution" value={`${project.resolution} · ${portrait ? '9:16' : '16:9'}`} />
              <Detail label="Duration" value={`${project.duration}s`} />
              <Detail label="Characters" value={project.characters.map((c) => c.name).join(', ')} />
              {project.videoSize > 0 && <Detail label="File size" value={formatBytes(project.videoSize)} />}
            </dl>
            <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
              This demo draws your images on a canvas and records them locally. Voice and music are simulated until the
              real backend is connected.
            </p>
          </Card>
        </div>
      </div>

      <Modal
        open={confirmDelete}
        onClose={() => busy !== 'delete' && setConfirmDelete(false)}
        title="Delete this project?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmDelete(false)} disabled={busy === 'delete'}>
              Keep project
            </Button>
            <Button variant="danger" loading={busy === 'delete'} onClick={remove}>
              Delete project
            </Button>
          </>
        }
      >
        <p>“{project.title}” and its video will be permanently removed from this device.</p>
      </Modal>
    </div>
  );
}
