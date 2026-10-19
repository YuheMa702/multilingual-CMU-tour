// Generated content is the single source of truth. No stop or story list is hardcoded here.
export const DEFAULT_LANG = 'en';
export let DEFAULT_STOP_ID = '';
export let TOUR_STOPS = [];
export let STOP_INDEX = Object.create(null);
export let STORIES = [];
export let STORY_INDEX = Object.create(null);
export let LANGUAGES = {};
export let UI_TEXT = {};
let initialized = false;

export async function initializeContent() {
  if (initialized) return;
  const response = await fetch('./content/metadata/generated.json', {cache: 'no-cache'});
  if (!response.ok) throw new Error(`Cannot load content manifest (${response.status}). Run node scripts/build-content.mjs first.`);
  const data = await response.json();
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
