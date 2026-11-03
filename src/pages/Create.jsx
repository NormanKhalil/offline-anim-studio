import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Sparkles } from 'lucide-react';
import Card from '../components/Card.jsx';
import Input from '../components/Input.jsx';
import Select from '../components/Select.jsx';
import Button from '../components/Button.jsx';
import SegmentedControl from '../components/SegmentedControl.jsx';
import ImageUploader from '../components/ImageUploader.jsx';
import { useToast } from '../context/ToastContext.jsx';
import useDocumentTitle from '../hooks/useDocumentTitle.js';
import { createProject } from '../api/api.js';
import { countWords, estimateDuration } from '../utils/scenes.js';
import { validateProjectForm } from '../utils/validators.js';
import {
  LANGUAGES,
  MAX_DURATION,
  MIN_DURATION,
  MUSIC,
  ORIENTATIONS,
  RESOLUTIONS,
  VOICES,
} from '../utils/constants.js';

const INITIAL = {
  title: '',
  script: '',
  language: 'english',
  voice: 'female',
  resolution: '720p',
  orientation: 'landscape',
  duration: 30,
  music: 'none',
};

export default function Create() {
  useDocumentTitle('New video');
  const navigate = useNavigate();
  const toast = useToast();
  const [values, setValues] = useState(INITIAL);
  const [images, setImages] = useState([]);
  const [touched, setTouched] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const errors = useMemo(() => validateProjectForm(values, images), [values, images]);
  const valid = Object.keys(errors).length === 0;
  const words = countWords(values.script);
  const estimate = estimateDuration(values.script);
  const tooLong = estimate > 60;
  const rtl = values.language === 'urdu';

  const set = (field) => (e) => setValues((v) => ({ ...v, [field]: e.target.value }));
  const setValue = (field) => (value) => setValues((v) => ({ ...v, [field]: value }));
  const touch = (field) => () => setTouched((t) => ({ ...t, [field]: true }));

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!valid || submitting) return;
    setSubmitting(true);
    try {
      const project = await createProject({
        ...values,
        duration: Number(values.duration),
        characters: images.map((i) => ({ name: i.name, file: i.file })),
      });
      toast.success('Project created. Starting generation…');
      navigate(`/generate/${project.id}`);
    } catch (err) {
      toast.error(err.message);
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} noValidate>
      <h1 className="text-2xl font-bold">Create a new video</h1>
      <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
        Add a script and your characters. Everything is processed on this device.
      </p>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          <Card title="Story">
            <div className="space-y-4">
              <Input
                label="Project title"
                value={values.title}
                onChange={set('title')}
                onBlur={touch('title')}
                error={touched.title ? errors.title : ''}
                maxLength={80}
                placeholder="e.g. The Clever Crow"
              />
              <div>
                <Input
                  label="Script"
                  multiline
                  rows={9}
                  value={values.script}
                  onChange={set('script')}
                  onBlur={touch('script')}
                  error={touched.script ? errors.script : ''}
                  dir={rtl ? 'rtl' : 'ltr'}
                  placeholder={rtl ? 'اپنی کہانی یہاں لکھیں…' : 'Write your story. Each sentence becomes a scene.'}
                  inputClassName="resize-y leading-relaxed"
                />
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span aria-live="polite">
                    {values.script.length} characters · {words} words · est. {estimate}s
                  </span>
                  {words > 0 && estimate >= MIN_DURATION && estimate <= MAX_DURATION && Number(values.duration) !== estimate && (
                    <button
                      type="button"
                      className="font-medium text-violet-600 hover:underline dark:text-violet-400"
                      onClick={() => setValue('duration')(estimate)}
                    >
                      Set duration to {estimate}s
                    </button>
                  )}
                </div>
                {tooLong && (
                  <p role="alert" className="mt-2 flex items-start gap-2 rounded-xl bg-amber-500/10 p-3 text-sm text-amber-600 dark:text-amber-400">
                    <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                    This script needs about {estimate} seconds, but videos are limited to 60 seconds. Shorten the script
                    or the video will feel rushed.
                  </p>
                )}
              </div>
            </div>
          </Card>

          <Card title="Characters" description="Upload 2–3 images. Give each character a name.">
            <ImageUploader
              items={images}
              onChange={(next) => {
                setImages(next);
                setTouched((t) => ({ ...t, images: true }));
              }}
              onReject={(m) => toast.error(m)}
            />
            {errors.images && touched.images && (
              <p role="alert" className="mt-2 text-xs text-red-500">
                {errors.images}
              </p>
            )}
          </Card>
        </div>

        <div className="space-y-6 lg:col-span-2">
          <Card title="Voice & language">
            <div className="space-y-4">
              <Select label="Language" options={LANGUAGES} value={values.language} onChange={set('language')} />
              <SegmentedControl label="Voice style" options={VOICES} value={values.voice} onChange={setValue('voice')} />
              <Select label="Background music" options={MUSIC} value={values.music} onChange={set('music')} />
            </div>
          </Card>

          <Card title="Video settings">
            <div className="space-y-4">
              <SegmentedControl label="Resolution" options={RESOLUTIONS.map((r) => ({ ...r, label: r.value }))} value={values.resolution} onChange={setValue('resolution')} />
              <SegmentedControl label="Orientation" options={ORIENTATIONS} value={values.orientation} onChange={setValue('orientation')} />
              <div>
                <label htmlFor="duration" className="mb-1.5 flex justify-between text-sm font-medium text-slate-700 dark:text-slate-300">
                  <span>Duration</span>
                  <span className="text-violet-600 dark:text-violet-400">{values.duration}s</span>
                </label>
                <input
                  id="duration"
                  type="range"
                  min={MIN_DURATION}
                  max={MAX_DURATION}
                  step={1}
                  value={values.duration}
                  onChange={set('duration')}
                  className="w-full accent-violet-600"
                />
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Rendering runs in real time, so a {values.duration}s video takes about {values.duration}s to finish.
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <Button type="submit" size="lg" className="w-full" icon={Sparkles} disabled={!valid} loading={submitting}>
              Generate Video
            </Button>
            {!valid && (
              <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-slate-500 dark:text-slate-400" aria-label="What is still missing">
                {Object.values(errors).map((msg) => (
                  <li key={msg}>{msg}</li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </form>
  );
}
