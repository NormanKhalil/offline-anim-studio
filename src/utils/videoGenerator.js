import { loadDrawable } from './image.js';

export class GenerationCancelled extends Error {
  constructor(message = 'Generation cancelled') {
    super(message);
    this.name = 'GenerationCancelled';
  }
}

const MIME_CANDIDATES = [
  'video/mp4;codecs=avc1.42E01E',
  'video/mp4;codecs=avc1',
  'video/mp4',
  'video/webm;codecs=vp9',
  'video/webm;codecs=vp8',
  'video/webm',
];

const PALETTES = {
  none: ['#1e1b4b', '#1e3a8a'],
  calm: ['#0f766e', '#1d4ed8'],
  epic: ['#7f1d1d', '#312e81'],
  happy: ['#f59e0b', '#db2777'],
  sad: ['#1e293b', '#475569'],
};

const FONT_FAMILY = '"Segoe UI", "Noto Nastaliq Urdu", "Noto Sans Devanagari", Tahoma, Arial, sans-serif';

/** Returns the best supported recording mime type, or null if recording is impossible. */
export function getSupportedMime() {
  if (typeof window === 'undefined' || typeof window.MediaRecorder === 'undefined') return null;
  if (
    typeof HTMLCanvasElement === 'undefined' ||
    typeof HTMLCanvasElement.prototype.captureStream !== 'function'
  ) {
    return null;
  }
  for (const mime of MIME_CANDIDATES) {
    try {
      if (window.MediaRecorder.isTypeSupported(mime)) return mime;
    } catch {
      // ignore and try the next candidate
    }
  }
  return null;
}

export function getCanvasSize(resolution, orientation) {
  const short = resolution === '1080p' ? 1080 : 720;
  const long = resolution === '1080p' ? 1920 : 1280;
  return orientation === 'portrait' ? { width: short, height: long } : { width: long, height: short };
}

function makeSprite(drawable) {
  const max = 1024;
  const scale = Math.min(1, max / Math.max(drawable.width, drawable.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(drawable.width * scale));
  canvas.height = Math.max(1, Math.round(drawable.height * scale));
  canvas.getContext('2d').drawImage(drawable.source, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function roundedRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function wrapLines(ctx, text, maxWidth) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function prepareScenes(ctx, scenes, fontSize, maxWidth, rtl) {
  ctx.font = `600 ${fontSize}px ${FONT_FAMILY}`;
  ctx.direction = rtl ? 'rtl' : 'ltr';
  return scenes.map((scene) => {
    const lines = wrapLines(ctx, scene.text, maxWidth);
    const pages = [];
    for (let i = 0; i < lines.length; i += 3) pages.push(lines.slice(i, i + 3));
    return { ...scene, pages: pages.length ? pages : [['']] };
  });
}

function drawFrame(ctx, w, h, t, model) {
  const { scenes, sprites, names, palette, fontSize, rtl, duration } = model;
  let idx = scenes.findIndex((s) => t >= s.start && t < s.end);
  if (idx < 0) idx = scenes.length - 1;
  const scene = scenes[idx];
  const sceneLen = Math.max(0.001, scene.end - scene.start);
  const local = Math.max(0, t - scene.start);
  const p = Math.min(1, local / sceneLen);
  const landscape = w > h;

  // Background
  const g = idx % 2 === 0 ? ctx.createLinearGradient(0, 0, w, h) : ctx.createLinearGradient(w, 0, 0, h);
  g.addColorStop(0, palette[0]);
  g.addColorStop(1, palette[1]);
  ctx.globalAlpha = 1;
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = 'rgba(255,255,255,0.07)';
  for (let i = 0; i < 6; i++) {
    const bx = (((i * 0.18 + 0.1 + Math.sin(t * 0.4 + i) * 0.04) % 1) + 1) % 1 * w;
    const by = (0.15 + ((i * 0.37) % 0.7) + Math.cos(t * 0.5 + i * 2) * 0.03) * h;
    const r = Math.min(w, h) * (0.05 + 0.02 * (i % 3));
    ctx.beginPath();
    ctx.arc(bx, by, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Character
  const sprite = sprites[scene.characterIndex % sprites.length];
  const fade = Math.max(0, Math.min(1, local / 0.4, (sceneLen - local) / 0.4));
  const boxW = w * 0.72;
  const boxH = h * (landscape ? 0.62 : 0.46);
  let scale = Math.min(boxW / sprite.width, boxH / sprite.height);
  let dx = 0;
  let dy = 0;
  switch (scene.animation) {
    case 'zoom':
      scale *= 1 + 0.14 * p;
      break;
    case 'pan':
      dx = (p - 0.5) * w * 0.1;
      scale *= 1.04;
      break;
    case 'bounce':
      dy = -Math.abs(Math.sin(local * Math.PI * 1.6)) * h * 0.035;
      break;
    default:
      scale *= 0.96 + 0.06 * p;
  }
  const dw = sprite.width * scale;
  const dh = sprite.height * scale;
  const baseY = h * (landscape ? 0.42 : 0.38);
  ctx.globalAlpha = fade * 0.3;
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(w / 2 + dx, baseY + dh / 2 + h * 0.012, dw * 0.32, h * 0.014, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = fade;
  ctx.drawImage(sprite, w / 2 + dx - dw / 2, baseY + dy - dh / 2, dw, dh);
  ctx.globalAlpha = 1;

  // Character name tag
  const tagSize = Math.round(fontSize * 0.55);
  ctx.font = `700 ${tagSize}px ${FONT_FAMILY}`;
  ctx.direction = 'ltr';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const label = names[scene.characterIndex % names.length] || '';
  const tagW = ctx.measureText(label).width + tagSize * 1.4;
  const tagH = tagSize * 1.9;
  const margin = Math.min(w, h) * 0.04;
  ctx.fillStyle = 'rgba(0,0,0,0.38)';
  roundedRect(ctx, margin, margin, tagW, tagH, tagH / 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.fillText(label, margin + tagSize * 0.7, margin + tagH / 2);

  ctx.globalAlpha = 0.6;
  ctx.textAlign = 'right';
  ctx.fillText('OfflineAnimStudio', w - margin, margin + tagH / 2);
  ctx.globalAlpha = 1;

  // Subtitles (paged so long sentences stay readable)
  const pages = scene.pages;
  const page = pages[Math.min(pages.length - 1, Math.floor(p * pages.length))];
  const lineH = fontSize * 1.35;
  const boxHeight = page.length * lineH + fontSize * 0.8;
  const boxY = h - boxHeight - h * 0.07;
  ctx.fillStyle = 'rgba(0,0,0,0.58)';
  roundedRect(ctx, w * 0.05, boxY, w * 0.9, boxHeight, fontSize * 0.5);
  ctx.fill();
  ctx.font = `600 ${fontSize}px ${FONT_FAMILY}`;
  ctx.direction = rtl ? 'rtl' : 'ltr';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  page.forEach((line, i) => {
    ctx.fillText(line, w / 2, boxY + fontSize * 0.4 + lineH * i + lineH / 2);
  });

  // Progress bar
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.fillRect(0, h - 6, w, 6);
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fillRect(0, h - 6, w * Math.min(1, t / duration), 6);
}

/**
 * Renders the project to a canvas in real time and records it with MediaRecorder.
 * characters: [{ name, image: drawable }]  (drawable from loadDrawable)
 * Resolves { blob, mime, ext }.
 */
export function generateVideo({ project, characters, onProgress, signal }) {
  return new Promise((resolve, reject) => {
    const mime = getSupportedMime();
    if (!mime) {
      reject(
        new Error(
          'Video recording is not supported in this browser (MediaRecorder / canvas.captureStream is unavailable). Please use a recent version of Chrome, Edge or Firefox.'
        )
      );
      return;
    }
    if (signal && signal.aborted) {
      reject(new GenerationCancelled());
      return;
    }

    const { width, height } = getCanvasSize(project.resolution, project.orientation);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      reject(new Error('Could not create a drawing surface for the video.'));
      return;
    }

    const duration = Number(project.duration) || 30;
    const rtl = project.language === 'urdu';
    const fontSize = Math.round(Math.min(width, height) * 0.05);
    const baseScenes = project.scenes && project.scenes.length
      ? project.scenes
      : [{ id: 1, text: project.script, start: 0, end: duration, characterIndex: 0, animation: 'zoom' }];

    const model = {
      scenes: prepareScenes(ctx, baseScenes, fontSize, width * 0.84, rtl),
      sprites: characters.map((c) => makeSprite(c.image)),
      names: characters.map((c) => c.name),
      palette: PALETTES[project.music] || PALETTES.none,
      fontSize,
      rtl,
      duration,
    };

    let stream;
    let recorder;
    try {
      stream = canvas.captureStream(30);
      recorder = new MediaRecorder(stream, {
        mimeType: mime,
        videoBitsPerSecond: width * height > 1000000 ? 6000000 : 3500000,
      });
    } catch (err) {
      reject(new Error('Could not start the video recorder: ' + (err && err.message ? err.message : err)));
      return;
    }

    const chunks = [];
    let timer = null;
    let aborted = false;
    let failed = null;

    const stopRecorder = () => {
      if (recorder.state !== 'inactive') {
        try {
          recorder.stop();
        } catch {
          // already stopped
        }
      }
    };
    const onAbort = () => {
      aborted = true;
      clearInterval(timer);
      stopRecorder();
    };
    if (signal) signal.addEventListener('abort', onAbort);

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };
    recorder.onerror = (e) => {
      failed = (e && e.error && e.error.message) || 'The video recorder reported an error.';
      clearInterval(timer);
      stopRecorder();
    };
    recorder.onstop = () => {
      clearInterval(timer);
      if (signal) signal.removeEventListener('abort', onAbort);
      stream.getTracks().forEach((track) => track.stop());
      if (aborted) {
        reject(new GenerationCancelled());
      } else if (failed) {
        reject(new Error(failed));
      } else {
        const type = recorder.mimeType || mime;
        const blob = new Blob(chunks, { type });
        if (!blob.size) {
          reject(new Error('The recorder produced an empty video.'));
          return;
        }
        resolve({ blob, mime: type, ext: type.startsWith('video/mp4') ? 'mp4' : 'webm' });
      }
    };

    const startedAt = performance.now();
    drawFrame(ctx, width, height, 0, model);
    recorder.start(250);
    timer = setInterval(() => {
      const t = (performance.now() - startedAt) / 1000;
      drawFrame(ctx, width, height, Math.min(t, duration), model);
      if (onProgress) onProgress(Math.min(1, t / duration));
      if (t >= duration) {
        clearInterval(timer);
        stopRecorder();
      }
    }, 1000 / 30);
  });
}
