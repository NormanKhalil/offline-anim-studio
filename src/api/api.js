/**
 * Mock API layer for OfflineAnimStudio.
 * Every function mirrors the shape of a future FastAPI/Flask backend, so only this
 * file has to be swapped for real fetch() calls later.
 *
 * Storage:  localStorage -> users, session, project metadata
 *           IndexedDB (idb-keyval) -> uploaded images ("img:<projectId>:<n>") and videos ("video:<projectId>")
 */
import { get, set, del, clear, keys } from 'idb-keyval';
import { buildScenes, countWords } from '../utils/scenes.js';
import { makeThumbnail, loadDrawable } from '../utils/image.js';
import {
  generateVideo,
  getCanvasSize,
  getSupportedMime,
  GenerationCancelled,
} from '../utils/videoGenerator.js';
import { uid, formatClock } from '../utils/format.js';
import { LANGUAGES, MUSIC, VOICES, labelOf } from '../utils/constants.js';
import { validateLogin, validateSignup } from '../utils/validators.js';

const LS_USERS = 'oas_users';
const LS_SESSION = 'oas_session';
const LS_PROJECTS = 'oas_projects';

const noop = () => {};
const delay = (min = 300, max = 800) =>
  new Promise((resolve) => setTimeout(resolve, min + Math.random() * (max - min)));

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
function writeJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

// NOTE: mock only – a real backend must hash passwords with bcrypt/argon2.
function hashPassword(pw) {
  let h = 5381;
  for (let i = 0; i < pw.length; i++) h = ((h << 5) + h + pw.charCodeAt(i)) | 0;
  return `mock$${(h >>> 0).toString(16)}$${pw.length}`;
}

const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email, createdAt: u.createdAt });
const readUsers = () => readJSON(LS_USERS, []);
const readProjects = () => readJSON(LS_PROJECTS, []);

function currentUserRecord() {
  const session = readJSON(LS_SESSION, null);
  if (!session) return null;
  return readUsers().find((u) => u.id === session.userId) || null;
}
function requireUser() {
  const user = currentUserRecord();
  if (!user) throw new Error('You need to sign in to continue.');
  return user;
}
function findProject(id) {
  return readProjects().find((p) => p.id === id) || null;
}
function patchProject(id, patch) {
  const list = readProjects();
  const index = list.findIndex((p) => p.id === id);
  if (index === -1) return null;
  list[index] = { ...list[index], ...patch };
  try {
    writeJSON(LS_PROJECTS, list);
  } catch {
    return null;
  }
  return list[index];
}

/* ------------------------------------------------------------------ AUTH */

// POST /api/auth/signup
export async function signup(data) {
  await delay();
  const errors = validateSignup(data);
  if (Object.keys(errors).length) throw new Error(Object.values(errors)[0]);
  const email = data.email.trim().toLowerCase();
  const users = readUsers();
  if (users.some((u) => u.email === email)) {
    throw new Error('An account with this email already exists. Try signing in instead.');
  }
  const user = {
    id: uid(),
    name: data.name.trim(),
    email,
    passwordHash: hashPassword(data.password),
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  writeJSON(LS_USERS, users);
  writeJSON(LS_SESSION, { userId: user.id });
  return publicUser(user);
}

// POST /api/auth/login
export async function login(data) {
  await delay();
  const errors = validateLogin(data);
  if (Object.keys(errors).length) throw new Error(Object.values(errors)[0]);
  const email = data.email.trim().toLowerCase();
  const user = readUsers().find((u) => u.email === email);
  if (!user || user.passwordHash !== hashPassword(data.password)) {
    throw new Error('Incorrect email or password.');
  }
  writeJSON(LS_SESSION, { userId: user.id });
  return publicUser(user);
}

// POST /api/auth/logout
export async function logout() {
  await delay(150, 300);
  localStorage.removeItem(LS_SESSION);
}

// GET /api/auth/me
export async function getCurrentUser() {
  await delay(300, 500);
  const user = currentUserRecord();
  return user ? publicUser(user) : null;
}

/* -------------------------------------------------------------- PROJECTS */

// GET /api/projects
export async function listProjects() {
  await delay();
  const user = requireUser();
  return readProjects()
    .filter((p) => p.userId === user.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

// GET /api/projects/:id
export async function getProject(id) {
  await delay();
  const user = requireUser();
  const project = findProject(id);
  if (!project || project.userId !== user.id) throw new Error('Project not found. It may have been deleted.');
  return project;
}

// POST /api/projects   (multipart: fields + character images)
export async function createProject(data) {
  await delay();
  const user = requireUser();
  const id = uid();
  const written = [];
  try {
    const thumbnail = await makeThumbnail(data.characters[0].file);
    const characters = [];
    for (let i = 0; i < data.characters.length; i++) {
      const key = `img:${id}:${i}`;
      await set(key, data.characters[i].file);
      written.push(key);
      characters.push({
        name: data.characters[i].name.trim() || `Character ${i + 1}`,
        imageKey: key,
        size: data.characters[i].file.size,
      });
    }
    const duration = Number(data.duration);
    const project = {
      id,
      userId: user.id,
      title: data.title.trim(),
      script: data.script.trim(),
      language: data.language,
      voice: data.voice,
      resolution: data.resolution,
      orientation: data.orientation,
      duration,
      music: data.music,
      characters,
      scenes: buildScenes(data.script, duration, characters.length),
      thumbnail,
      status: 'draft',
      error: null,
      videoMime: null,
      videoExt: null,
      videoSize: 0,
      createdAt: new Date().toISOString(),
      completedAt: null,
    };
    const list = readProjects();
    list.push(project);
    writeJSON(LS_PROJECTS, list);
    return project;
  } catch (err) {
    await Promise.all(written.map((k) => del(k).catch(noop)));
    if (err && err.name === 'QuotaExceededError') {
      throw new Error('Not enough local storage space. Delete some projects and try again.');
    }
    throw new Error(err && err.message ? err.message : 'Could not create the project.');
  }
}

// DELETE /api/projects/:id
export async function deleteProject(id) {
  await delay();
  const user = requireUser();
  const project = findProject(id);
  if (!project || project.userId !== user.id) throw new Error('Project not found.');
  cancelRun(id);
  const imageKeys = project.characters.map((c) => c.imageKey);
  await Promise.all([...imageKeys, `video:${id}`].map((k) => del(k).catch(noop)));
  writeJSON(
    LS_PROJECTS,
    readProjects().filter((p) => p.id !== id)
  );
}

// POST /api/projects/:id/reset  (clears the generated video so it can be regenerated)
export async function resetProject(id) {
  await delay();
  await getProject(id);
  cancelRun(id);
  await del(`video:${id}`).catch(noop);
  return patchProject(id, {
    status: 'draft',
    error: null,
    videoMime: null,
    videoExt: null,
    videoSize: 0,
    completedAt: null,
  });
}

// GET /api/projects/:id/images
export async function getProjectImages(id) {
  const project = findProject(id);
  if (!project) throw new Error('Project not found.');
  const result = [];
  for (const c of project.characters) {
    const blob = await get(c.imageKey);
    if (blob) result.push({ name: c.name, blob });
  }
  return result;
}

// GET /api/projects/:id/video
export async function getProjectVideo(id) {
  await delay(150, 300);
  const blob = await get(`video:${id}`);
  return blob || null;
}

/* ------------------------------------------------------------ GENERATION */

export const STAGES = [
  { key: 'script', title: 'Script Processing (NLP)', description: 'Cleaning text and detecting sentences and language', weight: 10, ms: 2400 },
  { key: 'scenes', title: 'Scene Generation', description: 'Building the scene timeline and camera moves', weight: 15, ms: 3000 },
  { key: 'animation', title: 'Character Animation', description: 'Preparing character images and motion curves', weight: 20, ms: 3600 },
  { key: 'voice', title: 'Voice Generation (TTS)', description: 'Synthesizing narration in the chosen voice', weight: 15, ms: 3000 },
  { key: 'music', title: 'Background Music', description: 'Selecting and mixing the music bed', weight: 10, ms: 2000 },
  { key: 'compose', title: 'Video Composition (FFmpeg)', description: 'Rendering frames and encoding the video', weight: 30, ms: 0 },
];

const STAGE_LOGS = [
  (p) => [
    `Tokenizing ${countWords(p.script)} words`,
    `Language set to ${labelOf(LANGUAGES, p.language)}`,
    `Detected ${p.scenes.length} scene(s)`,
  ],
  (p) => [
    'Laying out the scene timeline',
    `Assigning characters: ${p.characters.map((c) => c.name).join(', ')}`,
    'Planning zoom / pan / bounce / fade moves',
  ],
  () => ['Loading character sprites', 'Generating motion curves', 'Smoothing transitions'],
  (p) => [
    `Preparing ${labelOf(VOICES, p.voice).toLowerCase()} voice profile`,
    'Synthesizing narration (simulated)',
    'Normalizing audio levels',
  ],
  (p) => [
    p.music === 'none' ? 'No background music selected' : `Selecting "${labelOf(MUSIC, p.music)}" music bed`,
    'Mixing music under narration (simulated)',
  ],
];

const runs = new Map();

function createRunState() {
  return {
    status: 'running',
    startedAt: Date.now(),
    finishedAt: null,
    overall: 0,
    error: null,
    stages: STAGES.map((s) => ({
      key: s.key,
      title: s.title,
      description: s.description,
      status: 'pending',
      progress: 0,
    })),
    logs: [],
  };
}

function snapshot(state) {
  return { ...state, stages: state.stages.map((s) => ({ ...s })), logs: state.logs.slice() };
}

function emit(run) {
  run.onProgress(snapshot(run.state));
}

function recompute(run) {
  const total = STAGES.reduce((sum, s) => sum + s.weight, 0);
  const done = STAGES.reduce((sum, s, i) => sum + (s.weight * run.state.stages[i].progress) / 100, 0);
  run.state.overall = Math.min(100, Math.round((done / total) * 100));
}

function pushLog(run, message) {
  const elapsed = formatClock((Date.now() - run.state.startedAt) / 1000);
  run.state.logs.push({ id: run.state.logs.length + 1, time: elapsed, message });
  if (run.state.logs.length > 200) run.state.logs.shift();
}

function cancelRun(id) {
  const run = runs.get(id);
  if (run) {
    run.cancelled = true;
    run.controller.abort();
  }
}

function simulateStage(run, index, project) {
  return new Promise((resolve, reject) => {
    const stage = run.state.stages[index];
    const def = STAGES[index];
    const messages = STAGE_LOGS[index](project);
    stage.status = 'running';
    stage.progress = 0;
    run.state.currentStage = index;
    pushLog(run, `${def.title} started`);
    emit(run);
    const started = Date.now();
    let next = 0;
    const timer = setInterval(() => {
      if (run.cancelled) {
        clearInterval(timer);
        reject(new GenerationCancelled());
        return;
      }
      const p = Math.min(1, (Date.now() - started) / def.ms);
      stage.progress = Math.round(p * 100);
      while (next < messages.length && p >= (next + 1) / (messages.length + 1)) {
        pushLog(run, messages[next]);
        next += 1;
      }
      if (p >= 1) {
        clearInterval(timer);
        stage.status = 'done';
        stage.progress = 100;
        pushLog(run, `${def.title} finished`);
      }
      recompute(run);
      emit(run);
      if (p >= 1) resolve();
    }, 100);
  });
}

async function composeVideo(run, projectId, project) {
  const index = STAGES.length - 1;
  const stage = run.state.stages[index];
  stage.status = 'running';
  run.state.currentStage = index;
  pushLog(run, `${STAGES[index].title} started`);
  emit(run);

  if (!getSupportedMime()) {
    throw new Error(
      'Video recording is not supported in this browser (MediaRecorder / canvas.captureStream is unavailable). Please use a recent version of Chrome, Edge or Firefox.'
    );
  }
  const images = await getProjectImages(projectId);
  if (images.length < project.characters.length) {
    throw new Error('Some character images are missing from local storage. Please create the project again.');
  }
  const { width, height } = getCanvasSize(project.resolution, project.orientation);
  pushLog(run, `Initializing canvas renderer (${width}x${height})`);
  emit(run);

  const drawables = [];
  try {
    for (const img of images) drawables.push(await loadDrawable(img.blob));
    if (run.cancelled) throw new GenerationCancelled();
    let milestone = 0;
    const out = await generateVideo({
      project,
      characters: images.map((img, i) => ({ name: img.name, image: drawables[i] })),
      signal: run.controller.signal,
      onProgress: (p) => {
        stage.progress = Math.round(p * 100);
        const pct = Math.floor(stage.progress / 25) * 25;
        if (pct > milestone && pct < 100) {
          milestone = pct;
          pushLog(run, `Rendering frames… ${pct}%`);
        }
        recompute(run);
        emit(run);
      },
    });
    pushLog(run, `Encoding finished (${out.ext.toUpperCase()}, ${(out.blob.size / 1024 / 1024).toFixed(2)} MB)`);
    await set(`video:${projectId}`, out.blob);
    if (!findProject(projectId)) {
      await del(`video:${projectId}`).catch(noop);
      throw new GenerationCancelled('Project was deleted');
    }
    stage.status = 'done';
    stage.progress = 100;
    pushLog(run, `${STAGES[index].title} finished`);
    recompute(run);
    emit(run);
    return out;
  } finally {
    drawables.forEach((d) => d.close());
  }
}

async function executePipeline(projectId, run) {
  const project = findProject(projectId);
  if (!project) throw new GenerationCancelled('Project no longer exists');
  patchProject(projectId, { status: 'generating', error: null });
  pushLog(run, `Pipeline started for "${project.title}"`);
  emit(run);
  try {
    for (let i = 0; i < STAGES.length - 1; i++) {
      await simulateStage(run, i, project);
    }
    const out = await composeVideo(run, projectId, project);
    const updated = patchProject(projectId, {
      status: 'completed',
      error: null,
      videoMime: out.mime,
      videoExt: out.ext,
      videoSize: out.blob.size,
      completedAt: new Date().toISOString(),
    });
    run.state.status = 'completed';
    run.state.finishedAt = Date.now();
    run.state.overall = 100;
    pushLog(run, 'Video is ready');
    emit(run);
    return updated;
  } catch (err) {
    const cancelled = err instanceof GenerationCancelled || run.cancelled;
    run.state.finishedAt = Date.now();
    run.state.stages.forEach((s) => {
      if (s.status === 'running') s.status = cancelled ? 'pending' : 'error';
    });
    if (cancelled) {
      run.state.status = 'cancelled';
      pushLog(run, 'Generation cancelled');
      patchProject(projectId, { status: 'cancelled' });
      emit(run);
      throw new GenerationCancelled();
    }
    const message = err && err.message ? err.message : 'Generation failed.';
    run.state.status = 'failed';
    run.state.error = message;
    pushLog(run, `Error: ${message}`);
    patchProject(projectId, { status: 'failed', error: message });
    emit(run);
    throw new Error(message);
  }
}

// POST /api/projects/:id/generate   (+ SSE / WebSocket for progress events)
// Calling it again while a run is active simply re-attaches the new onProgress callback.
export async function startGeneration(projectId, onProgress) {
  const existing = runs.get(projectId);
  if (existing) {
    existing.onProgress = onProgress || noop;
    emit(existing);
    return existing.promise;
  }
  const run = {
    cancelled: false,
    controller: new AbortController(),
    onProgress: onProgress || noop,
    state: createRunState(),
    promise: null,
  };
  runs.set(projectId, run);
  run.promise = executePipeline(projectId, run).finally(() => {
    if (runs.get(projectId) === run) runs.delete(projectId);
  });
  run.promise.catch(noop); // avoid unhandled-rejection noise when nobody is listening
  return run.promise;
}

// POST /api/projects/:id/cancel
export async function cancelGeneration(projectId) {
  cancelRun(projectId);
  await delay(300, 500);
}

/* --------------------------------------------------------------- STORAGE */

// GET /api/storage
export async function getStorageUsage() {
  await delay(150, 300);
  let used = 0;
  try {
    const allKeys = await keys();
    for (const k of allKeys) {
      const value = await get(k);
      if (value && typeof value.size === 'number') used += value.size;
    }
  } catch {
    // IndexedDB unavailable – report what we can
  }
  ['oas_users', 'oas_session', 'oas_projects'].forEach((k) => {
    const v = localStorage.getItem(k);
    if (v) used += v.length * 2;
  });
  let quota = null;
  try {
    if (navigator.storage && navigator.storage.estimate) {
      const est = await navigator.storage.estimate();
      quota = est.quota || null;
    }
  } catch {
    quota = null;
  }
  return { used, quota };
}

// DELETE /api/data   (wipes everything stored for this device)
export async function clearAllData() {
  await delay();
  Array.from(runs.keys()).forEach(cancelRun);
  try {
    await clear();
  } catch {
    // ignore
  }
  [LS_USERS, LS_SESSION, LS_PROJECTS].forEach((k) => localStorage.removeItem(k));
}
