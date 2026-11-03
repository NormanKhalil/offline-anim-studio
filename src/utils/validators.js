import { MAX_IMAGES, MIN_IMAGES } from './constants.js';
import { countWords } from './scenes.js';

export const MAX_FILE_BYTES = 5 * 1024 * 1024;
export const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(email || '').trim());
}

export function validateLogin({ email, password }) {
  const errors = {};
  if (!email || !email.trim()) errors.email = 'Enter your email address.';
  else if (!isValidEmail(email)) errors.email = 'Enter a valid email address.';
  if (!password) errors.password = 'Enter your password.';
  return errors;
}

export function validateSignup({ name, email, password, confirm }) {
  const errors = {};
  if (!name || name.trim().length < 2) errors.name = 'Enter your name (at least 2 characters).';
  if (!email || !email.trim()) errors.email = 'Enter your email address.';
  else if (!isValidEmail(email)) errors.email = 'Enter a valid email address.';
  if (!password) errors.password = 'Create a password.';
  else if (password.length < 6) errors.password = 'Password must be at least 6 characters.';
  if (!confirm) errors.confirm = 'Confirm your password.';
  else if (confirm !== password) errors.confirm = 'Passwords do not match.';
  return errors;
}

export function validateImageFile(file) {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return `"${file.name}" is not supported. Use PNG, JPG or WEBP images.`;
  }
  if (file.size > MAX_FILE_BYTES) {
    return `"${file.name}" is larger than 5 MB.`;
  }
  return null;
}

export function validateProjectForm(values, images) {
  const errors = {};
  const title = values.title.trim();
  if (title.length < 3) errors.title = 'Give your project a title (at least 3 characters).';
  else if (title.length > 80) errors.title = 'Title must be 80 characters or fewer.';
  if (countWords(values.script) < 5) errors.script = 'Write a script with at least 5 words.';
  if (images.length < MIN_IMAGES) {
    errors.images = `Upload at least ${MIN_IMAGES} character images (${images.length}/${MAX_IMAGES}).`;
  } else if (images.some((img) => !img.name.trim())) {
    errors.images = 'Every character needs a name.';
  }
  return errors;
}
