/** Decodes an image Blob into something drawable on a canvas. Call close() when done. */
export async function loadDrawable(blob) {
  if (typeof createImageBitmap === 'function') {
    try {
      const bmp = await createImageBitmap(blob);
      return {
        source: bmp,
        width: bmp.width,
        height: bmp.height,
        close: () => {
          if (typeof bmp.close === 'function') bmp.close();
        },
      };
    } catch {
      // fall through to the <img> decoder
    }
  }
  const url = URL.createObjectURL(blob);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () =>
      resolve({
        source: img,
        width: img.naturalWidth,
        height: img.naturalHeight,
        close: () => URL.revokeObjectURL(url),
      });
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('This image could not be decoded.'));
    };
    img.src = url;
  });
}

/** Small JPEG data URL used as the project thumbnail (kept in localStorage). */
export async function makeThumbnail(blob, width = 320, height = 180) {
  const drawable = await loadDrawable(blob);
  try {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    const g = ctx.createLinearGradient(0, 0, width, height);
    g.addColorStop(0, '#4c1d95');
    g.addColorStop(1, '#1e3a8a');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, height);
    const s = Math.min(width / drawable.width, height / drawable.height);
    const w = drawable.width * s;
    const h = drawable.height * s;
    ctx.drawImage(drawable.source, (width - w) / 2, (height - h) / 2, w, h);
    return canvas.toDataURL('image/jpeg', 0.75);
  } finally {
    drawable.close();
  }
}
