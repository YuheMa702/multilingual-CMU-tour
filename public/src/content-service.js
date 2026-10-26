import {
  DEFAULT_LANG, DEFAULT_STOP_ID, STORIES, STORY_INDEX, STOP_INDEX, TOUR_STOPS,
  buildMainRoute, getStopName
} from './content-manifest.js';

const transcriptCache = new Map();
const STOP_PLACEHOLDER = './static/ui-assets/stop-placeholder.svg';
const STORY_PLACEHOLDER = './static/ui-assets/story-placeholder.svg';

export function getStops() { return TOUR_STOPS; }
export function getStop(stopId) { return STOP_INDEX[stopId] || STOP_INDEX[DEFAULT_STOP_ID]; }
export function isValidStop(stopId) { return Boolean(STOP_INDEX[stopId]); }

// A story is selectable only if it has a recording in the selected UI language.
// The optional lang argument preserves compatibility with callers doing an ID-only check.
export function isValidStory(storyId, lang = null) {
  if (storyId === 'intro') return true;
  const story = STORY_INDEX[storyId];
  return Boolean(story && (!lang || story.audio?.[lang]));
}

// Stop narrations retain their original language fallback behavior.
function selectStopMedia(stop, requestedLanguage) {
  const available = Object.keys(stop.audio || {}).sort();
  const audioLang = (stop.audio?.[requestedLanguage] && requestedLanguage)
    || (stop.audio?.[DEFAULT_LANG] && DEFAULT_LANG)
    || available[0];
  return {audioLang, audioSrc: audioLang ? stop.audio[audioLang] : ''};
}

function getStoryTitle(story, lang) {
  return story.names?.[lang] || story.names?.[DEFAULT_LANG] || story.id;
}

async function fetchTranscript(url) {
  if (!url) return [];
  if (!transcriptCache.has(url)) {
    transcriptCache.set(url, (async () => {
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return parseWebVtt(await response.text());
      } catch (error) {
        console.warn(`Transcript not available: ${url}`, error);
        return [];
      }
    })());
  }
  return transcriptCache.get(url);
}

// Parse WebVTT cues for the existing synchronized three-line transcript UI.
export function parseWebVtt(text) {
  const blocks = String(text || '').replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').split(/\n\s*\n/);
  const cues = [];
  for (const block of blocks) {
    const lines = block.split('\n').map(x => x.trim()).filter(Boolean);
    if (!lines.length || /^(WEBVTT|NOTE|STYLE|REGION)(\s|$)/i.test(lines[0])) continue;
    const timeIndex = lines.findIndex(x => x.includes('-->'));
    if (timeIndex < 0) continue;
    const match = lines[timeIndex].match(/^((?:\d{2,}:)?\d{2}:\d{2}(?:\.\d{1,3})?)\s+-->\s+((?:\d{2,}:)?\d{2}:\d{2}(?:\.\d{1,3})?)/);
    if (!match) continue;
    const time = parseTimestamp(match[1]);
    const endTime = parseTimestamp(match[2]);
    if (!Number.isFinite(time) || !Number.isFinite(endTime) || endTime < time) continue;
    const cueText = lines.slice(timeIndex + 1).join(' ').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    if (cueText) cues.push({time, text: cueText});
  }
  return cues.sort((a, b) => a.time - b.time);
}

function parseTimestamp(value) {
  const pieces = value.split(':');
  if (pieces.length < 2 || pieces.length > 3) return NaN;
  const seconds = Number(pieces.pop());
  const minutes = Number(pieces.pop());
  const hours = pieces.length ? Number(pieces.pop()) : 0;
  if (minutes >= 60 || seconds >= 60 || [seconds, minutes, hours].some(x => !Number.isFinite(x))) return NaN;
  return hours * 3600 + minutes * 60 + seconds;
}

function getRelatedStories(stopId, lang) {
  // The catalog is global across stops, but recordings are language-specific.
  // Do not substitute an English recording for a Chinese (or Spanish) story card.
  return STORIES
    .filter(story => Boolean(story.audio?.[lang]))
    // Each language can have its own story order, taken from stories.tsv.
    .sort((a, b) => (a.positionByLanguage?.[lang] ?? Infinity) - (b.positionByLanguage?.[lang] ?? Infinity))
    .map(story => ({
      id: story.id,
      title: getStoryTitle(story, lang),
      speaker: story.speaker,
      description: '',
      images: story.images?.[lang] || [],
      thumbnail: story.images?.[lang]?.[0] || STORY_PLACEHOLDER,
      route: buildMainRoute(stopId, story.id),
      audioSrc: story.audio[lang],
      audioLang: lang,
      transcriptSrc: story.transcripts?.[lang] || '',
      slideOffset: 0
    }));
}

export async function loadTourView(stopId, storyId, lang = DEFAULT_LANG) {
  const stop = getStop(stopId);
  if (!stop) throw new Error('No stop available');
  const relatedStories = getRelatedStories(stop.id, lang);

  // Unavailable story/language combinations safely fall back to the stop intro.
  // The router also normalizes unsupported deep links to the intro route.
  const story = storyId && storyId !== 'intro'
    ? relatedStories.find(item => item.id === storyId)
    : null;
  if (story) {
    const transcript = await fetchTranscript(story.transcriptSrc);
    return {
      stop, stopId: stop.id, storyId: story.id, viewKind: 'story',
      relatedStories, activeCardId: story.id,
      viewTitle: story.title, viewDescription: story.description,
      route: buildMainRoute(stop.id, story.id),
      slides: story.images.length ? story.images : [STORY_PLACEHOLDER],
      audioSrc: story.audioSrc, transcript, transcriptTitle: story.title,
      usingPlaceholderTranscript: !story.transcriptSrc,
      usingPlaceholderStoryMedia: !story.transcriptSrc || story.thumbnail === STORY_PLACEHOLDER,
      assetLang: story.audioLang
    };
  }

  const {audioLang, audioSrc} = selectStopMedia(stop, lang);
  const transcriptSrc = stop.transcripts?.[audioLang] || '';
  const transcript = await fetchTranscript(transcriptSrc);
  return {
    stop, stopId: stop.id, storyId: 'intro', viewKind: 'intro',
    relatedStories, activeCardId: 'intro',
    viewTitle: getStopName(stop.id, lang), viewDescription: '',
    route: buildMainRoute(stop.id, 'intro'),
    slides: stop.images?.length ? stop.images : [STOP_PLACEHOLDER],
    audioSrc, transcript, transcriptTitle: getStopName(stop.id, lang),
    usingPlaceholderTranscript: !transcriptSrc,
    usingPlaceholderStoryMedia: false, assetLang: audioLang
  };
}
