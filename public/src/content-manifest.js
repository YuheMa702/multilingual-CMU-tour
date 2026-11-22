// Generated content is the single source of truth. No stop or story list is hardcoded here.
export const DEFAULT_LANG = 'en';
export let DEFAULT_STOP_ID = '';
export let TOUR_STOPS = [];
export let STOP_INDEX = Object.create(null);
export let STORIES = [];
export let STORY_INDEX = Object.create(null);
export let LANGUAGES = {};
export let UI_TEXT = {};
export let IMAGE_ALTS = {};
let initialized = false;

export async function initializeContent() {
  if (initialized) return;
  const response = await fetch('./content/metadata/generated.json', {cache: 'no-cache'});
  if (!response.ok) throw new Error(`Cannot load content manifest (${response.status}). Run node scripts/build-content.mjs first.`);
  const data = await response.json();
  // Image descriptions are editorial content, keyed by normalized photo filename.
  // Absent metadata must not prevent the tour from loading.
  let altData = {images: {}};
  try {
    const altResponse = await fetch('./content/metadata/image-alt.json', {cache: 'no-cache'});
    if (altResponse.ok) {
      const parsed = await altResponse.json();
      if (parsed?.schemaVersion === 1 && parsed.images && typeof parsed.images === 'object') altData = parsed;
    }
  } catch (error) {
    console.warn('Optional image descriptions unavailable', error);
  }
  if (data.schemaVersion !== 1 || !Array.isArray(data.stops) || !Array.isArray(data.stories)) {
    throw new Error('Unsupported or malformed generated content manifest');
  }
  if (!data.stops.length) throw new Error('No tour stops configured');
  TOUR_STOPS = data.stops;
  STOP_INDEX = Object.fromEntries(data.stops.map(stop => [stop.id, stop]));
  STORIES = data.stories;
  STORY_INDEX = Object.fromEntries(data.stories.map(story => [story.id, story]));
  DEFAULT_STOP_ID = data.defaultStopId;
  LANGUAGES = data.languages;
  UI_TEXT = data.ui;
  IMAGE_ALTS = altData.images;
  initialized = true;
}

export function getUiText(lang) { return UI_TEXT[lang] || UI_TEXT[DEFAULT_LANG] || {}; }
export function getLanguageLabel(targetLang, uiLang = DEFAULT_LANG) {
  const item = LANGUAGES[targetLang];
  return item?.labels?.[uiLang] || item?.labels?.[DEFAULT_LANG] || item?.native || targetLang;
}
export function getLanguageCodes() { return Object.keys(LANGUAGES); }
export function getStopName(stopId, lang = DEFAULT_LANG) {
  const stop = STOP_INDEX[stopId];
  return stop?.names?.[lang] || stop?.names?.[DEFAULT_LANG] || stopId;
}
export function buildMainRoute(stopId = DEFAULT_STOP_ID, storyId = 'intro') {
  const stop = encodeURIComponent(stopId);
  return storyId && storyId !== 'intro' ? `#/main/${stop}/story/${encodeURIComponent(storyId)}` : `#/main/${stop}`;
}

// Read the translated, contributor-provided alt text for a content photo.
// Legacy or decorative images without supplied descriptions use the caller's fallback.
export function getImageAlt(src, lang = DEFAULT_LANG, fallback = '') {
  const filename = decodeURIComponent(String(src || '').split('/').pop() || '');
  const translations = IMAGE_ALTS[filename];
  return translations?.[lang] || translations?.[DEFAULT_LANG] || fallback;
}
