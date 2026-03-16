export const DEFAULT_LANG = "en";
export const DEFAULT_STOP_ID = "welcome-center";

export const LANGUAGES = {
  en: {
    labels: { en: "English", zh: "English", es: "English" }
  },
  zh: {
    labels: { en: "中文", zh: "中文", es: "中文" }
  },
  es: {
    labels: { en: "Español", zh: "Español", es: "Español" }
  }
};

export const UI_TEXT = {
  en: {
    selectLanguageHeading: "Select your language",
    selectLanguageBody: "Choose a language to begin the CMU campus tour experience.",
    prototypeLabel: "Prototype build",
    languageLabel: "Language",
    chooseStopLabel: "Tour stop",
    onboardingTitle: "How this tour works",
    onboardingBody: "Each stop includes image slides, audio playback, and a synchronized transcript. You can seek through the audio at any time, and the transcript will follow the current playback position.",
    dontShowAgain: "Don’t show this again",
    continueLabel: "Continue",
    backLabel: "Back",
    loadingLabel: "Loading stop content…",
    mainIntroLabel: "Stop intro",
    relatedStoriesTitle: "Related stories",
    transcriptTitle: "Transcript",
    audioTitle: "Audio",
    imageSlidesTitle: "Image slides",
    changeLanguage: "Change language",
    resetOnboarding: "Reset onboarding",
    backToIntro: "Back to stop intro",
    introChip: "Intro",
    stopMenuAria: "Campus tour stops",
    storiesDescription: "Select a related story to open the same player layout with story-specific navigation.",
    placeholderStoryNotice: "Placeholder story view: this currently reuses the stop’s intro media until custom story assets are added.",
    placeholderTranscriptNotice: "Transcript placeholder: replace the current lyrics file with final copy for this language.",
    previousSlide: "Previous slide",
    nextSlide: "Next slide",
    transcriptJumpHint: "Click a transcript line to jump to that point in the audio.",
    currentViewLabel: "Current view",
    stopIntroCardTitle: "Main intro",
    stopIntroCardBody: "Return to the primary introduction for this stop.",
    noStoriesLabel: "No related stories yet.",
    playAnotherStory: "Open story",
    loadingErrorTitle: "We couldn’t load this stop.",
    loadingErrorBody: "Please confirm the stop assets exist in public/content and try again."
  },
  zh: {
    selectLanguageHeading: "选择语言",
    selectLanguageBody: "请选择一种语言，开始 CMU 校园导览体验。",
    prototypeLabel: "原型版本",
    languageLabel: "语言",
    chooseStopLabel: "导览地点",
    onboardingTitle: "导览使用说明",
    onboardingBody: "每个地点都会显示图片轮播、音频播放和同步滚动字幕。你可以随时拖动音频进度，字幕会自动跳到对应位置。",
    dontShowAgain: "下次不再显示",
    continueLabel: "继续",
    backLabel: "返回",
    loadingLabel: "正在加载地点内容……",
    mainIntroLabel: "地点主介绍",
    relatedStoriesTitle: "相关故事",
    transcriptTitle: "字幕",
    audioTitle: "音频",
    imageSlidesTitle: "图片轮播",
    changeLanguage: "切换语言",
    resetOnboarding: "重置引导页",
    backToIntro: "回到地点主介绍",
    introChip: "主介绍",
    stopMenuAria: "校园导览地点列表",
    storiesDescription: "点击相关故事后，会进入相同版式的故事播放器页面。",
    placeholderStoryNotice: "占位故事页面：在正式故事素材加入前，这里暂时复用该地点的主介绍媒体内容。",
    placeholderTranscriptNotice: "字幕为占位内容：请将此语言对应的歌词/讲稿文件替换为正式版本。",
    previousSlide: "上一张",
    nextSlide: "下一张",
    transcriptJumpHint: "点击某一行字幕，可直接跳转到对应音频时间。",
    currentViewLabel: "当前内容",
    stopIntroCardTitle: "主介绍",
    stopIntroCardBody: "返回该地点的主导览音频与图片。",
    noStoriesLabel: "暂时没有相关故事。",
    playAnotherStory: "打开故事",
    loadingErrorTitle: "无法加载此地点内容。",
    loadingErrorBody: "请确认 public/content 中存在对应静态资源后再试。"
  },
  es: {
    selectLanguageHeading: "Selecciona tu idioma",
    selectLanguageBody: "Elige un idioma para comenzar la experiencia del recorrido por CMU.",
    prototypeLabel: "Versión prototipo",
    languageLabel: "Idioma",
    chooseStopLabel: "Parada del recorrido",
    onboardingTitle: "Cómo funciona este recorrido",
    onboardingBody: "Cada parada incluye diapositivas de imágenes, reproducción de audio y una transcripción sincronizada. Puedes mover el audio en cualquier momento y la transcripción seguirá la posición actual.",
    dontShowAgain: "No mostrar de nuevo",
    continueLabel: "Continuar",
    backLabel: "Atrás",
    loadingLabel: "Cargando contenido…",
    mainIntroLabel: "Introducción de la parada",
    relatedStoriesTitle: "Historias relacionadas",
    transcriptTitle: "Transcripción",
    audioTitle: "Audio",
    imageSlidesTitle: "Diapositivas",
    changeLanguage: "Cambiar idioma",
    resetOnboarding: "Reiniciar introducción",
    backToIntro: "Volver a la introducción",
    introChip: "Introducción",
    stopMenuAria: "Paradas del recorrido",
    storiesDescription: "Selecciona una historia relacionada para abrir el mismo diseño con navegación entre historias.",
    placeholderStoryNotice: "Vista provisional: por ahora reutiliza los recursos principales de la parada hasta agregar contenido propio.",
    placeholderTranscriptNotice: "Transcripción provisional: reemplaza el archivo de letras con el texto final para este idioma.",
    previousSlide: "Anterior",
    nextSlide: "Siguiente",
    transcriptJumpHint: "Haz clic en una línea para saltar a ese punto del audio.",
    currentViewLabel: "Vista actual",
    stopIntroCardTitle: "Introducción principal",
    stopIntroCardBody: "Vuelve a la introducción principal de esta parada.",
    noStoriesLabel: "Todavía no hay historias relacionadas.",
    playAnotherStory: "Abrir historia",
    loadingErrorTitle: "No se pudo cargar esta parada.",
    loadingErrorBody: "Confirma que los recursos existan en public/content e inténtalo de nuevo."
  }
};

export const STORY_TEMPLATES = [
  {
    id: "student-life",
    slideOffset: 1,
    titles: {
      en: "Student life",
      zh: "学生生活",
      es: "Vida estudiantil"
    },
    descriptions: {
      en: "Placeholder story card for student perspectives at this stop.",
      zh: "学生视角占位故事，可在此地点后续替换为真实学生内容。",
      es: "Tarjeta provisional para una historia sobre la experiencia estudiantil."
    }
  },
  {
    id: "academics",
    slideOffset: 2,
    titles: {
      en: "Academic experience",
      zh: "学术体验",
      es: "Experiencia académica"
    },
    descriptions: {
      en: "Placeholder story card for classroom, labs, or learning moments.",
      zh: "课堂、实验室与学习体验的占位故事。",
      es: "Tarjeta provisional para clases, laboratorios o momentos de aprendizaje."
    }
  },
  {
    id: "campus-culture",
    slideOffset: 3,
    titles: {
      en: "Campus culture",
      zh: "校园文化",
      es: "Cultura del campus"
    },
    descriptions: {
      en: "Placeholder story card for traditions, events, and campus atmosphere.",
      zh: "校园传统、活动与氛围的占位故事。",
      es: "Tarjeta provisional para tradiciones, eventos y ambiente del campus."
    }
  }
];

export const TOUR_STOPS = [
  {
    id: "welcome-center",
    folder: "welcome-center",
    names: {
      en: "Coulter Welcome Center",
      zh: "Coulter欢迎中心",
      es: "Centro de Bienvenida Coulter"
    }
  },
  {
    id: "tepper",
    folder: "tepper",
    names: {
      en: "Tepper School of Business",
      zh: "Tepper商学院",
      es: "Escuela de Negocios Tepper"
    }
  },
  {
    id: "wean",
    folder: "wean",
    names: {
      en: "Wean Hall",
      zh: "Wean Hall / 梅隆科学学院",
      es: "Wean Hall"
    }
  },
  {
    id: "hunt",
    folder: "hunt",
    names: {
      en: "Hunt Library",
      zh: "Hunt图书馆",
      es: "Biblioteca Hunt"
    }
  },
  {
    id: "uc",
    folder: "uc",
    names: {
      en: "Cohon University Center",
      zh: "Cohon大学中心",
      es: "Centro Universitario Cohon"
    }
  },
  {
    id: "hamerschlag",
    folder: "hamerschlag",
    names: {
      en: "Hamerschlag Hall",
      zh: "Hamerschlag 工程学院",
      es: "Hamerschlag Hall"
    }
  },
  {
    id: "cfa",
    folder: "cfa",
    names: {
      en: "College of Fine Arts",
      zh: "CFA艺术学院",
      es: "Facultad de Bellas Artes"
    }
  },
  {
    id: "purnell",
    folder: "purnell",
    names: {
      en: "Purnell Center",
      zh: "Purnell中心",
      es: "Centro Purnell"
    }
  },
  {
    id: "fence",
    folder: "fence",
    names: {
      en: "The Fence",
      zh: "校园围栏",
      es: "La Valla"
    }
  },
  {
    id: "dc",
    folder: "DC",
    names: {
      en: "Dietrich College",
      zh: "Dietrich人文与社会科学学院",
      es: "Dietrich College"
    }
  },
  {
    id: "ghc",
    folder: "GHC",
    names: {
      en: "Gates & Hillman Centers",
      zh: "Gates 与 Hillman 中心 / 计算机学院",
      es: "Centros Gates y Hillman"
    }
  }
];

export const STOP_INDEX = Object.fromEntries(TOUR_STOPS.map((stop) => [stop.id, stop]));

export function getUiText(lang) {
  return UI_TEXT[lang] || UI_TEXT[DEFAULT_LANG];
}

export function getLanguageLabel(targetLang, uiLang = DEFAULT_LANG) {
  const target = LANGUAGES[targetLang];
  if (!target) return targetLang;
  return target.labels[uiLang] || target.labels[DEFAULT_LANG] || targetLang;
}

export function getStopName(stopId, lang = DEFAULT_LANG) {
  const stop = STOP_INDEX[stopId];
  if (!stop) return stopId;
  return stop.names[lang] || stop.names[DEFAULT_LANG] || stop.id;
}

export function buildMainRoute(stopId = DEFAULT_STOP_ID, storyId = "intro") {
  if (!storyId || storyId === "intro") return `#/main/${stopId}`;
  return `#/main/${stopId}/story/${storyId}`;
}