export const LANGUAGES = [
  { value: 'english', label: 'English' },
  { value: 'urdu', label: 'Urdu (اردو)' },
  { value: 'hindi', label: 'Hindi (हिन्दी)' },
];
export const VOICES = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'child', label: 'Child' },
];
export const RESOLUTIONS = [
  { value: '720p', label: '720p (HD)' },
  { value: '1080p', label: '1080p (Full HD)' },
];
export const ORIENTATIONS = [
  { value: 'landscape', label: 'Landscape 16:9' },
  { value: 'portrait', label: 'Portrait 9:16' },
];
export const MUSIC = [
  { value: 'none', label: 'None' },
  { value: 'calm', label: 'Calm' },
  { value: 'epic', label: 'Epic' },
  { value: 'happy', label: 'Happy' },
  { value: 'sad', label: 'Sad' },
];

export const MIN_IMAGES = 2;
export const MAX_IMAGES = 3;
export const MIN_DURATION = 10;
export const MAX_DURATION = 60;

export function labelOf(list, value) {
  const found = list.find((item) => item.value === value);
  return found ? found.label : value;
}
