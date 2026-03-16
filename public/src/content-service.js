import {
  DEFAULT_LANG,
  DEFAULT_STOP_ID,
  STORY_TEMPLATES,
  STOP_INDEX,
  TOUR_STOPS,
  buildMainRoute,
  getStopName,
  getUiText
} from "./content-manifest.js";

const introCache = new Map();

export function getStops() {
  return TOUR_STOPS;
}

export function getStop(stopId) {
  return STOP_INDEX[stopId] || STOP_INDEX[DEFAULT_STOP_ID];
}

export function isValidStop(stopId) {
  return Boolean(STOP_INDEX[stopId]);
}

export function isValidStory(storyId) {
  return storyId === "intro" || STORY_TEMPLATES.some((story) => story.id === storyId);
}

export async function loadTourView(stopId, storyId, lang = DEFAULT_LANG) {
  const stop = getStop(stopId);
  const intro = await loadIntroContent(stop, lang);
  const relatedStories = buildRelatedStories(stop, intro.slides, lang);

  if (!storyId || storyId === "intro") {
    return {
      ...intro,
      stop,
      stopId: stop.id,
      storyId: "intro",
      route: buildMainRoute(stop.id, "intro"),
      viewKind: "intro",
      relatedStories,
      activeCardId: "intro",
      viewTitle: getStopName(stop.id, lang),
      viewDescription: "",
      usingPlaceholderStoryMedia: false
    };
  }

  const activeStory = relatedStories.find((story) => story.id === storyId) || relatedStories[0];
  return {
    ...intro,
    stop,
    stopId: stop.id,
    storyId: activeStory.id,
    route: buildMainRoute(stop.id, activeStory.id),
    viewKind: "story",
    relatedStories,
    activeCardId: activeStory.id,
    viewTitle: activeStory.title,
    viewDescription: activeStory.description,
    slides: rotateSlides(intro.slides, activeStory.slideOffset),
    usingPlaceholderStoryMedia: true
  };
}

async function loadIntroContent(stop, lang) {
  const assetLang = getAssetLang(lang);
  const cacheKey = `${stop.id}:${assetLang}`;
  if (introCache.has(cacheKey)) return introCache.get(cacheKey);

  const promise = (async () => {
    const base = `/content/${stop.folder}`;
    const slideNames = await fetchJson(`${base}/images/images.json`, []);
    const slides = Array.isArray(slideNames)
      ? slideNames.map((name) => `${base}/images/${name}`)
      : [];

    const transcriptPath = `${base}/lyrics/lyrics-${assetLang}.txt`;
    const transcriptRaw = await fetchText(transcriptPath, "");
    const parsedTranscript = parseLyricsTranscript(transcriptRaw, {
      stopName: getStopName(stop.id, lang),
      lang,
      ui: getUiText(lang)
    });

    return {
      stop,
      slides,
      audioSrc: `${base}/audio/audio-${assetLang}.MP3`,
      transcript: parsedTranscript.lines,
      transcriptTitle: parsedTranscript.title,
      usingPlaceholderTranscript: parsedTranscript.usingPlaceholder,
      assetLang
    };
  })();

  introCache.set(cacheKey, promise);
  return promise;
}

function buildRelatedStories(stop, slides, lang) {
  return STORY_TEMPLATES.map((template, index) => ({
    id: template.id,
    title: template.titles[lang] || template.titles[DEFAULT_LANG],
    description: template.descriptions[lang] || template.descriptions[DEFAULT_LANG],
    thumbnail: pickThumbnail(slides, template.slideOffset || index + 1),
    route: buildMainRoute(stop.id, template.id),
    slideOffset: template.slideOffset || index + 1
  }));
}

function pickThumbnail(slides, offset = 0) {
  if (!slides.length) return "";
  return slides[offset % slides.length];
}

function rotateSlides(slides, offset = 0) {
  if (!slides.length) return [];
  const normalized = ((offset % slides.length) + slides.length) % slides.length;
  return [...slides.slice(normalized), ...slides.slice(0, normalized)];
}

function getAssetLang(lang) {
  return lang === "zh" ? "zh" : "en";
}

async function fetchJson(url, fallbackValue) {
  try {
    const response = await fetch(url);
    if (!response.ok) return fallbackValue;
    return await response.json();
  } catch {
    return fallbackValue;
  }
}

async function fetchText(url, fallbackValue) {
  try {
    const response = await fetch(url);
    if (!response.ok) return fallbackValue;
    return await response.text();
  } catch {
    return fallbackValue;
  }
}

function parseLyricsTranscript(rawText, { stopName, lang, ui }) {
  const lines = [];
  let title = stopName;

  for (const rawLine of String(rawText || "").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    if (line.startsWith("[TITLE]")) {
      title = line.replace("[TITLE]", "").trim() || stopName;
      continue;
    }

    const match = line.match(/^\[(\d{2}):(\d{2})\]\s*(.*)$/);
    if (!match) continue;

    const minute = Number(match[1]);
    const second = Number(match[2]);
    const text = match[3].trim();
    lines.push({
      time: minute * 60 + second,
      text
    });
  }

  const onlyDummy = lines.length <= 1 && lines.every((line) => !line.text || /dummy text/i.test(line.text));
  if (!lines.length || onlyDummy) {
    return {
      title,
      usingPlaceholder: true,
      lines: buildPlaceholderTranscript(stopName, lang, ui)
    };
  }

  return {
    title,
    usingPlaceholder: false,
    lines
  };
}

function buildPlaceholderTranscript(stopName, lang, ui) {
  if (lang === "zh") {
    return [
      { time: 0, text: `欢迎来到 ${stopName}。这里是当前中文内容的占位字幕。` },
      { time: 8, text: "你可以继续使用现有播放器、图片轮播和滚动字幕逻辑。" },
      { time: 16, text: "之后只需替换对应地点的音频与讲稿文本文件即可。" },
      { time: 24, text: ui.placeholderTranscriptNotice }
    ];
  }

  if (lang === "es") {
    return [
      { time: 0, text: `Bienvenido a ${stopName}. Esta es una transcripción provisional.` },
      { time: 8, text: "Puedes seguir usando el reproductor, las imágenes y el panel de transcripción sin cambiar la lógica de la interfaz." },
      { time: 16, text: "Más adelante, solo reemplaza los archivos de audio y texto de esta parada." },
      { time: 24, text: ui.placeholderTranscriptNotice }
    ];
  }

  return [
    { time: 0, text: `Welcome to ${stopName}. This is a placeholder transcript for the current language.` },
    { time: 8, text: "The page layout, audio player, and transcript syncing are already wired up for this stop." },
    { time: 16, text: "To replace this copy, update the matching lyrics file inside the stop folder under public/content." },
    { time: 24, text: ui.placeholderTranscriptNotice }
  ];
}