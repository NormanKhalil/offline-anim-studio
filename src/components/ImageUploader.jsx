import { useEffect, useRef, useState } from 'react';
import { UploadCloud, X } from 'lucide-react';
import Input from './Input.jsx';
import { validateImageFile } from '../utils/validators.js';
import { formatBytes, uid } from '../utils/format.js';
import { MAX_IMAGES, MIN_IMAGES } from '../utils/constants.js';

export default function ImageUploader({ items, onChange, onReject }) {
  const inputRef = useRef(null);
  const itemsRef = useRef(items);
  const [dragging, setDragging] = useState(false);
  const full = items.length >= MAX_IMAGES;

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  // Revoke every preview URL when the uploader goes away.
  useEffect(() => {
    return () => {
      itemsRef.current.forEach((i) => URL.revokeObjectURL(i.url));
    };
  }, []);

  const addFiles = (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    const room = MAX_IMAGES - items.length;
    if (room <= 0) {
      onReject(`You can upload at most ${MAX_IMAGES} images. Remove one to add another.`);
      return;
    }
    const accepted = [];
    for (const file of files) {
      const problem = validateImageFile(file);
      if (problem) {
        onReject(problem);
        continue;
      }
      if (accepted.length >= room) {
        onReject(`Only ${MAX_IMAGES} images are allowed – extra files were ignored.`);
        break;
      }
      accepted.push({
        id: uid(),
        file,
        url: URL.createObjectURL(file),
        name: `Character ${items.length + accepted.length + 1}`,
      });
    }
    if (accepted.length) onChange([...items, ...accepted]);
  };

  const remove = (item) => {
    URL.revokeObjectURL(item.url);
    onChange(items.filter((i) => i.id !== item.id));
  };

  const rename = (item, name) => onChange(items.map((i) => (i.id === item.id ? { ...i, name } : i)));

  const openPicker = () => {
    if (!full && inputRef.current) inputRef.current.click();
  };

  return (
    <div>
      <div
        role="button"
        tabIndex={full ? -1 : 0}
        aria-disabled={full}
        aria-label="Upload character images. Drag and drop or press Enter to browse."
        onClick={openPicker}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openPicker();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!full) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          addFiles(e.dataTransfer.files);
        }}
        className={`flex cursor-pointer flex-col items-center rounded-2xl border-2 border-dashed px-4 py-8 text-center transition ${
          dragging
            ? 'border-violet-500 bg-violet-500/10'
            : 'border-slate-300 hover:border-violet-400 dark:border-slate-700'
        } ${full ? 'cursor-not-allowed opacity-60' : ''}`}
      >
        <UploadCloud size={30} className="mb-2 text-violet-500" aria-hidden="true" />
        <p className="text-sm font-medium">{full ? 'Maximum images added' : 'Drag & drop images here, or click to browse'}</p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          PNG, JPG or WEBP · {MIN_IMAGES}–{MAX_IMAGES} images · max 5 MB each
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          multiple
          tabIndex={-1}
          className="sr-only"
          aria-hidden="true"
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      {items.length > 0 && (
        <ul className="mt-4 grid gap-3 sm:grid-cols-3">
          {items.map((item) => (
            <li key={item.id} className="rounded-xl border border-slate-200 p-2 dark:border-slate-800">
              <div className="relative">
                <img
                  src={item.url}
                  alt={`Preview of ${item.name || 'character'}`}
                  className="h-32 w-full rounded-lg bg-slate-100 object-contain dark:bg-slate-950"
                />
                <button
                  type="button"
                  onClick={() => remove(item)}
                  aria-label={`Remove ${item.name || 'image'}`}
                  className="absolute right-1.5 top-1.5 rounded-full bg-slate-900/70 p-1 text-white hover:bg-red-600"
                >
                  <X size={14} />
                </button>
              </div>
              <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
                {item.file.name} · {formatBytes(item.file.size)}
              </p>
              <Input
                label="Character name"
                value={item.name}
                maxLength={30}
                onChange={(e) => rename(item, e.target.value)}
                className="mt-1.5"
                inputClassName="!py-1.5"
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
