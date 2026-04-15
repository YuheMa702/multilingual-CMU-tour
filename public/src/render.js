import {
  DEFAULT_LANG,
  DEFAULT_STOP_ID,
  buildMainRoute,
  getLanguageLabel,
  getStopName,
  getUiText,
  TOUR_STOPS
} from "./content-manifest.js";
import { getStops, loadTourView } from "./content-service.js";
import { clearViewCleanup, nextRenderToken, registerCleanup, setLanguage, setOnboardingSeen, state } from "./state.js";

export async function render() {
  clearViewCleanup();

  const root = document.getElementById("app");
  const token = nextRenderToken();
  const route = state.route?.name || "lang";
  const ui = getUiText(state.lang || DEFAULT_LANG);

  if (route === "lang") return renderLang(root);
  if (route === "onboarding") return renderOnboarding(root);
  if (route === "main") return renderMain(root, token);

  root.innerHTML = `<div class="app-page centered-page"><div class="phone-shell"><div class="simple-card">${escapeHtml(ui.unknownRouteLabel)}</div></div></div>`;
}

function renderLang(root) {
  const uiLang = state.lang || DEFAULT_LANG;
  const ui = getUiText(uiLang);
  const selectedLang = state.lang || "";

  root.innerHTML = `
    <div class="app-page centered-page landing-page">
      <div class="phone-shell landing-shell">
        <div class="landing-container">
          <div class="landing-hero">
            <img src="/static/ui-assets/School.png" alt="${escapeHtml(ui.coulterHallAlt)}">
          </div>
          <img src="/static/ui-assets/Carnegie Mellon University.png" alt="${escapeHtml(ui.cmuLogoAlt)}" class="cmu-logo">
          <p class="landing-subtitle">${escapeHtml(ui.guidedTourLabel)}</p>

          <div class="language-selector">
            <div class="select-container">
              <select id="languageSelect" class="language-select" aria-label="${escapeHtml(ui.selectLanguageAria)}">
                <option value="">${escapeHtml(ui.selectLanguagePlaceholder)}</option>
                ${getLanguageCodes().map((lang) => `
                  <option value="${lang}" ${selectedLang === lang ? "selected" : ""}>${escapeHtml(getLanguageLabel(lang, lang))}</option>
                `).join("")}
              </select>
              <div class="select-arrow"></div>
            </div>

            <button id="nextButton" class="next-button ${state.lang ? "enabled" : ""}" ${state.lang ? "" : "disabled"}>${escapeHtml(ui.nextLabel)}</button>
          </div>
        </div>
      </div>
    </div>
  `;

  const languageSelect = root.querySelector("#languageSelect");
  const nextButton = root.querySelector("#nextButton");

  languageSelect?.addEventListener("change", function onChange() {
    if (this.value) {
      setLanguage(this.value);
      render();
      return;
    }
    nextButton?.classList.remove("enabled");
    if (nextButton) nextButton.disabled = true;
  });

  nextButton?.addEventListener("click", () => {
    const lang = languageSelect?.value;
    if (!lang) return;
    setLanguage(lang);
    location.hash = "#/onboarding";
  });
}

function renderOnboarding(root) {
  const ui = getUiText(state.lang || DEFAULT_LANG);

  root.innerHTML = `
    <div class="app-page centered-page landing-page">
      <div class="phone-shell landing-shell">
        <div class="landing-container onboarding-container">
          <div id="intros" class="intros visible">
            <div class="intro-slide active" data-index="0">
              <p class="intro-copy">${escapeHtml(ui.onboardingSlides[0])}</p>
              <img class="intro-illustration" src="/static/ui-assets/megaphone.png" alt="${escapeHtml(ui.megaphoneAlt)}">
            </div>
            <div class="intro-slide" data-index="1">
              <p class="intro-copy">${escapeHtml(ui.onboardingSlides[1])}</p>
              <img class="intro-illustration" src="/static/ui-assets/pause.png" alt="${escapeHtml(ui.pauseIllustrationAlt)}">
            </div>
            <div class="intro-slide" data-index="2">
              <p class="intro-copy">${escapeHtml(ui.onboardingSlides[2])}</p>
              <img class="intro-illustration story-illustration" src="/static/ui-assets/studentstory.png" alt="${escapeHtml(ui.studentStoryAlt)}">
              <div class="intro-cta">
                <button id="introStartBtn" class="next-button enabled">${escapeHtml(ui.nextLabel)}</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  const slides = [...root.querySelectorAll(".intro-slide")];
  let introIndex = 0;
  let introTimer = null;

  function showIntro(index) {
    slides.forEach((slide, idx) => {
      slide.classList.remove("active", "leaving");
      if (idx === index) return;
      if (slide.dataset.wasActive === "1") {
        slide.classList.add("leaving");
        window.setTimeout(() => slide.classList.remove("leaving"), 600);
      }
      slide.dataset.wasActive = "0";
    });

    const active = slides[index];
    if (active) {
      active.classList.add("active");
      active.dataset.wasActive = "1";
    }
  }

  function startIntroAutoPlay() {
    if (introTimer) window.clearInterval(introTimer);
    introTimer = window.setInterval(() => {
      if (introIndex >= slides.length - 1) {
        window.clearInterval(introTimer);
        introTimer = null;
        return;
      }
      introIndex += 1;
      showIntro(introIndex);
    }, 3000);
  }

  showIntro(0);
  startIntroAutoPlay();
  registerCleanup(() => {
    if (introTimer) window.clearInterval(introTimer);
  });

  root.querySelector("#introStartBtn")?.addEventListener("click", () => {
    setOnboardingSeen(true);
    location.hash = buildMainRoute(DEFAULT_STOP_ID, "intro");
  });
}

async function renderMain(root, token) {
  const lang = state.lang || DEFAULT_LANG;
  const ui = getUiText(lang);
  const { stopId = DEFAULT_STOP_ID, storyId = "intro" } = state.route || {};

  root.innerHTML = `
    <div class="app-page centered-page detail-page-shell">
      <div class="phone-shell detail-shell">
        <div class="loading-state">${escapeHtml(ui.loadingLabel)}</div>
      </div>
    </div>
  `;

  try {
    const view = await loadTourView(stopId, storyId, lang);
    if (token !== state.renderToken) return;

    root.innerHTML = buildMainMarkup(view, lang);
    bindMainInteractions(root, view, lang);
  } catch (error) {
    console.error(error);
    if (token !== state.renderToken) return;
    root.innerHTML = `
      <div class="app-page centered-page detail-page-shell">
        <div class="phone-shell detail-shell">
          <div class="simple-card error-card">
            <h1>${escapeHtml(ui.loadingErrorTitle)}</h1>
            <p>${escapeHtml(ui.loadingErrorBody)}</p>
          </div>
        </div>
      </div>
    `;
  }
}

function buildMainMarkup(view, lang) {
  const ui = getUiText(lang);
  const stopOrder = Math.max(1, TOUR_STOPS.findIndex((stop) => stop.id === view.stopId) + 1);
  const introRoute = buildMainRoute(view.stopId, "intro");
  const storyCards = [
    {
      id: "intro",
      title: ui.mainIntroductionTitle,
      description: ui.mainIntroductionDescription,
      thumbnail: view.relatedStories[0]?.thumbnail || view.slides[0] || "",
      route: introRoute
    },
    ...view.relatedStories
  ];

  const slides = view.slides.length ? view.slides : [""];
  const title = view.viewKind === "story"
    ? view.viewTitle
    : (view.transcriptTitle || getStopName(view.stopId, lang));
  const languageOptions = getOrderedLanguageCodes(lang);

  return `
    <div class="app-page centered-page detail-page-shell">
      <div class="phone-shell detail-shell">
        <div class="content-container" data-view-kind="${escapeHtml(view.viewKind)}">
          <img src="/static/ui-assets/menu.png" alt="${escapeHtml(ui.menuAlt)}" class="menu-btn" id="menuBtn">

          <div class="slideshow-container">
            ${slides.map((src, index) => `
              <div class="mySlides fade ${index === 0 ? "showing" : ""}" data-index="${index}">
                <div class="numbertext">${index + 1} / ${slides.length}</div>
                ${src
                  ? `<img src="${escapeHtml(src)}" alt="${escapeHtml(ui.slideLabel)} ${index + 1}">`
                  : `<div class="slide-placeholder">${escapeHtml(ui.noImageLabel)}</div>`}
              </div>
            `).join("")}
            ${slides.length > 1 ? `
              <button class="prev" id="prevSlideBtn" type="button" aria-label="${escapeHtml(ui.seekBackwardAlt)}">&#10094;</button>
              <button class="next" id="nextSlideBtn" type="button" aria-label="${escapeHtml(ui.seekForwardAlt)}">&#10095;</button>
            ` : ""}
            <div class="dots-wrapper">
              ${slides.map((_, index) => `<button class="dot ${index === 0 ? "active" : ""}" type="button" data-index="${index}" aria-label="${escapeHtml(ui.slideLabel)} ${index + 1}"></button>`).join("")}
            </div>
          </div>

          <div class="title">
            <div class="circle">${stopOrder}</div>
            <div class="title-block">
              <div id="mainTitle" class="mainTitle">${escapeHtml(title)}</div>
              ${view.viewKind === "story" ? `
                <button id="backToIntroBtn" class="back-to-intro-btn" type="button">${escapeHtml(ui.backToIntro)}</button>
              ` : ""}
            </div>
          </div>

          <div class="musicPlayer">
            <audio id="audio" preload="metadata" src="${escapeHtml(view.audioSrc)}"></audio>

            <div class="progress-container" id="progressContainer">
              <div class="progress-bar" id="progressBar"></div>
              <div class="progress-circle" id="progressCircle"></div>
            </div>

            <div class="musicPlayerIcon">
              <button id="seekBackward10Btn" class="seek-btn" type="button">
                <img src="/static/ui-assets/back.svg" alt="${escapeHtml(ui.seekBackwardAlt)}" class="seek-icon">
              </button>
              <button id="previousStopBtn" class="control-icon-link" type="button">
                <img src="/static/ui-assets/previous.png" alt="${escapeHtml(ui.previousStopAlt)}" class="control-icon">
              </button>
              <button id="playPauseBtn" type="button" aria-label="${escapeHtml(ui.playPauseAria)}">
                <img class="musicButton" id="playIcon" src="/static/ui-assets/play.svg" alt="${escapeHtml(ui.playAlt)}">
                <img class="musicButton" id="pauseIcon" src="/static/ui-assets/pause.svg" alt="${escapeHtml(ui.pauseAlt)}" style="display:none;">
              </button>
              <button id="nextStopBtn" class="control-icon-link" type="button">
                <img src="/static/ui-assets/next.png" alt="${escapeHtml(ui.nextStopAlt)}" class="control-icon">
              </button>
              <button id="seekForward10Btn" class="seek-btn" type="button">
                <img src="/static/ui-assets/forward.svg" alt="${escapeHtml(ui.seekForwardAlt)}" class="seek-icon">
              </button>
            </div>

            <div class="lyrics-player" id="lyricsPlayer">
              <div class="lyrics-gradient-top"></div>
              <div class="lyrics-scroll" id="lyricsScroll">
                <div id="lyrics"></div>
              </div>
              <div class="lyrics-gradient-bottom"></div>
              <img src="/static/ui-assets/enlarge.svg" alt="${escapeHtml(ui.enlargeTranscriptAlt)}" class="lyrics-enlarge-icon" id="lyricsToggleBtn">
            </div>
          </div>

          <div class="stories-header-block">
            <h2>${escapeHtml(ui.relatedStoriesTitle)}</h2>
            <h3>${escapeHtml(ui.relatedStoriesSubtitle)}</h3>
          </div>
          <div class="stories">
            ${storyCards.map((card) => `
              <button class="story-card-link ${card.id === view.activeCardId ? "selected" : ""}" type="button" data-route="${escapeHtml(card.route)}">
                ${card.thumbnail
                  ? `<img class="storyImg" src="${escapeHtml(card.thumbnail)}" alt="${escapeHtml(card.title)}">`
                  : `<div class="storyImg story-placeholder"></div>`}
                <span class="story-card-caption">${escapeHtml(card.title)}</span>
              </button>
            `).join("")}
          </div>

          <div id="sideMenu" class="side-menu">
            <div id="mainMenuView" class="menu-view active">
              <div class="side-menu-header">
                <img src="/static/ui-assets/menu.png" class="side-menu-close" alt="${escapeHtml(ui.closeMenuAlt)}">
                <span>${escapeHtml(ui.menuTitle)}</span>
              </div>
              <ul class="side-menu-list" id="sideMenuList">
                ${getStops().map((stop, index) => `
                  <li data-stop-id="${escapeHtml(stop.id)}">
                    <span class="side-menu-num-circle">${index + 1}</span>
                    <span class="side-menu-title">${escapeHtml(getStopName(stop.id, lang))}</span>
                  </li>
                `).join("")}
              </ul>
              <div class="side-menu-footer" id="openSettingsBtn">
                <span class="settings-gear">⚙</span>
                <span>${escapeHtml(ui.settingsAndPreferences)}</span>
              </div>
            </div>

            <div id="settingsView" class="menu-view">
              <div class="side-menu-header">
                <img src="/static/ui-assets/previous.svg" class="side-menu-back" alt="${escapeHtml(ui.backToMenuAlt)}">
                <span>${escapeHtml(ui.settingsTitle)}</span>
              </div>
              <div class="settings-content">
                <div class="setting-group">
                  <label class="setting-label">${escapeHtml(ui.languageSettingLabel)}</label>
                  <div class="language-options" id="languageOptions">
                    ${languageOptions.map((code) => {
                      const labels = getLanguageOptionLabels(code, lang);
                      return `
                        <div class="language-option ${code === lang ? "selected" : ""}" data-lang="${code}">
                          <input type="radio" name="language" value="${code}" ${code === lang ? "checked" : ""}>
                          <span class="language-name">${escapeHtml(labels.primary)}</span>
                          <span class="language-native">${escapeHtml(labels.secondary)}</span>
                        </div>
                      `;
                    }).join("")}
                  </div>
                </div>
                <div class="setting-group settings-actions">
                  <button class="menu-action-button" id="changeLanguageBtn" type="button">${escapeHtml(ui.changeLanguageScreen)}</button>
                  <button class="menu-action-button secondary" id="replayOnboardingBtn" type="button">${escapeHtml(ui.replayOnboarding)}</button>
                </div>
              </div>
            </div>
          </div>
          <div id="sideMenuOverlay" class="side-menu-overlay"></div>
        </div>
      </div>
    </div>
  `;
}

function bindMainInteractions(root, view, lang) {
  const ui = getUiText(lang);
  const audio = root.querySelector("#audio");
  const progressContainer = root.querySelector("#progressContainer");
  const progressBar = root.querySelector("#progressBar");
  const progressCircle = root.querySelector("#progressCircle");
  const playIcon = root.querySelector("#playIcon");
  const pauseIcon = root.querySelector("#pauseIcon");
  const lyrics = root.querySelector("#lyrics");
  const lyricsPlayer = root.querySelector("#lyricsPlayer");
  const lyricsScroll = root.querySelector("#lyricsScroll");
  const lyricsToggleBtn = root.querySelector("#lyricsToggleBtn");
  const slides = [...root.querySelectorAll(".mySlides")];
  const dots = [...root.querySelectorAll(".dot")];
  const stopList = getStops();
  const currentStopIndex = stopList.findIndex((stop) => stop.id === view.stopId);
  let slideIndex = 0;
  let isDragging = false;
  let currentLine = 0;
  let userIsScrolling = false;
  let scrollTimeout = null;
  const transcript = view.transcript || [];

  function showSlide(index) {
    if (!slides.length) return;
    slideIndex = ((index % slides.length) + slides.length) % slides.length;
    slides.forEach((slide, idx) => {
      slide.style.display = idx === slideIndex ? "block" : "none";
    });
    dots.forEach((dot, idx) => {
      dot.classList.toggle("active", idx === slideIndex);
    });
  }

  showSlide(0);
  if (slides.length > 1) {
    root.querySelector("#prevSlideBtn")?.addEventListener("click", () => showSlide(slideIndex - 1));
    root.querySelector("#nextSlideBtn")?.addEventListener("click", () => showSlide(slideIndex + 1));
    dots.forEach((dot) => dot.addEventListener("click", () => showSlide(Number(dot.dataset.index || 0))));
  }

  function updateProgressBarDisplay(progress) {
    const safeProgress = Math.min(100, Math.max(0, progress || 0));
    progressBar.style.width = `${safeProgress}%`;
    progressCircle.style.left = `${safeProgress}%`;
  }

  function syncPlayPauseIcon() {
    const isPaused = audio.paused;
    playIcon.style.display = isPaused ? "inline" : "none";
    pauseIcon.style.display = isPaused ? "none" : "inline";
  }

  function renderLyrics(forceUpdate = false) {
    if (!transcript.length) {
      lyrics.innerHTML = `<div class="lyric-line current">${escapeHtml(ui.noTranscriptLabel)}</div>`;
      return;
    }

    const enlarged = lyricsPlayer.classList.contains("enlarged");
    if (enlarged && userIsScrolling && !forceUpdate) return;

    if (enlarged) {
      lyrics.innerHTML = transcript.map((line, index) => `
        <button class="lyric-line lyric-line-button ${index === currentLine ? "current" : ""}" type="button" data-index="${index}" data-time="${line.time}">
          ${escapeHtml(line.text)}
        </button>
      `).join("");

      const currentButton = lyrics.querySelector(`.lyric-line-button[data-index="${currentLine}"]`);
      if (currentButton) {
        currentButton.scrollIntoView({ block: "center", inline: "nearest", behavior: "auto" });
      }
    } else {
      const previous = transcript[currentLine - 1]?.text || "&nbsp;";
      const current = transcript[currentLine]?.text || "&nbsp;";
      const next = transcript[currentLine + 1]?.text || "&nbsp;";
      lyrics.innerHTML = `
        <div class="lyric-line">${previous === "&nbsp;" ? previous : escapeHtml(previous)}</div>
        <div class="lyric-line current">${current === "&nbsp;" ? current : escapeHtml(current)}</div>
        <div class="lyric-line">${next === "&nbsp;" ? next : escapeHtml(next)}</div>
      `;
    }

    lyrics.querySelectorAll(".lyric-line-button").forEach((button) => {
      button.addEventListener("click", () => {
        const targetTime = Number(button.dataset.time || 0);
        const targetIndex = Number(button.dataset.index || 0);
        currentLine = targetIndex;
        audio.currentTime = targetTime;
        audio.play().catch(() => {});
        renderLyrics(true);
      });
    });
  }

  function syncLyricsToTime() {
    if (!transcript.length) return;
    while (currentLine < transcript.length - 1 && audio.currentTime >= transcript[currentLine + 1].time) {
      currentLine += 1;
    }
    while (currentLine > 0 && audio.currentTime < transcript[currentLine].time) {
      currentLine -= 1;
    }
    renderLyrics();
  }

  playIcon.addEventListener("click", () => {
    audio.play().catch(() => {});
  });

  pauseIcon.addEventListener("click", () => {
    audio.pause();
  });

  audio.addEventListener("play", syncPlayPauseIcon);
  audio.addEventListener("pause", syncPlayPauseIcon);
  audio.addEventListener("ended", syncPlayPauseIcon);
  audio.addEventListener("timeupdate", () => {
    if (!isDragging && Number.isFinite(audio.duration) && audio.duration > 0) {
      updateProgressBarDisplay((audio.currentTime / audio.duration) * 100);
    }
    syncLyricsToTime();
  });
  audio.addEventListener("loadedmetadata", () => {
    updateProgressBarDisplay(0);
    syncLyricsToTime();
  });
  audio.addEventListener("seeking", syncLyricsToTime);
  syncPlayPauseIcon();
  renderLyrics(true);

  function seekFromClientX(clientX) {
    if (!Number.isFinite(audio.duration) || audio.duration <= 0) return;
    const rect = progressContainer.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const time = ratio * audio.duration;
    audio.currentTime = time;
    updateProgressBarDisplay(ratio * 100);
  }

  progressContainer.addEventListener("mousedown", (event) => {
    isDragging = true;
    seekFromClientX(event.clientX);
  });
  document.addEventListener("mousemove", (event) => {
    if (!isDragging) return;
    seekFromClientX(event.clientX);
  });
  document.addEventListener("mouseup", () => {
    isDragging = false;
  });
  progressContainer.addEventListener("click", (event) => {
    seekFromClientX(event.clientX);
    if (audio.paused) audio.play().catch(() => {});
  });

  progressContainer.addEventListener("touchstart", (event) => {
    const touch = event.touches[0];
    if (!touch) return;
    isDragging = true;
    seekFromClientX(touch.clientX);
  }, { passive: true });
  document.addEventListener("touchmove", (event) => {
    if (!isDragging) return;
    const touch = event.touches[0];
    if (!touch) return;
    seekFromClientX(touch.clientX);
  }, { passive: true });
  document.addEventListener("touchend", () => {
    isDragging = false;
  });

  root.querySelector("#seekBackward10Btn")?.addEventListener("click", () => {
    audio.currentTime = Math.max(0, (audio.currentTime || 0) - 10);
  });
  root.querySelector("#seekForward10Btn")?.addEventListener("click", () => {
    const duration = Number.isFinite(audio.duration) ? audio.duration : Number.MAX_SAFE_INTEGER;
    audio.currentTime = Math.min(duration, (audio.currentTime || 0) + 10);
  });

  function goToStopByOffset(delta) {
    if (currentStopIndex < 0) return;
    const nextIndex = currentStopIndex + delta;
    if (nextIndex < 0 || nextIndex >= stopList.length) return;
    location.hash = buildMainRoute(stopList[nextIndex].id, "intro");
  }

  const previousStopBtn = root.querySelector("#previousStopBtn");
  const nextStopBtn = root.querySelector("#nextStopBtn");
  if (previousStopBtn) {
    previousStopBtn.disabled = currentStopIndex <= 0;
    previousStopBtn.addEventListener("click", () => goToStopByOffset(-1));
  }
  if (nextStopBtn) {
    nextStopBtn.disabled = currentStopIndex >= stopList.length - 1;
    nextStopBtn.addEventListener("click", () => goToStopByOffset(1));
  }

  lyricsToggleBtn?.addEventListener("click", () => {
    lyricsPlayer.classList.toggle("enlarged");
    userIsScrolling = false;
    renderLyrics(true);
  });
  lyricsScroll?.addEventListener("scroll", () => {
    if (!lyricsPlayer.classList.contains("enlarged")) return;
    userIsScrolling = true;
    if (scrollTimeout) window.clearTimeout(scrollTimeout);
    scrollTimeout = window.setTimeout(() => {
      userIsScrolling = false;
      renderLyrics(true);
    }, 1800);
  });

  root.querySelectorAll("[data-route]").forEach((node) => {
    node.addEventListener("click", () => {
      const route = node.getAttribute("data-route");
      if (route) location.hash = route;
    });
  });

  root.querySelector("#backToIntroBtn")?.addEventListener("click", () => {
    location.hash = buildMainRoute(view.stopId, "intro");
  });

  const sideMenu = root.querySelector("#sideMenu");
  const sideMenuOverlay = root.querySelector("#sideMenuOverlay");
  const mainMenuView = root.querySelector("#mainMenuView");
  const settingsView = root.querySelector("#settingsView");

  function openMenu() {
    sideMenu?.classList.add("open");
    sideMenuOverlay?.classList.add("open");
  }

  function closeMenu() {
    sideMenu?.classList.remove("open");
    sideMenuOverlay?.classList.remove("open");
    window.setTimeout(() => {
      mainMenuView?.classList.add("active");
      mainMenuView?.classList.remove("slide-out");
      settingsView?.classList.remove("active");
    }, 250);
  }

  root.querySelector("#menuBtn")?.addEventListener("click", openMenu);
  root.querySelector(".side-menu-close")?.addEventListener("click", closeMenu);
  sideMenuOverlay?.addEventListener("click", closeMenu);

  root.querySelectorAll("#sideMenuList li[data-stop-id]").forEach((item) => {
    item.addEventListener("click", () => {
      const targetStopId = item.getAttribute("data-stop-id");
      closeMenu();
      if (targetStopId) location.hash = buildMainRoute(targetStopId, "intro");
    });
  });

  root.querySelector("#openSettingsBtn")?.addEventListener("click", () => {
    mainMenuView?.classList.add("slide-out");
    mainMenuView?.classList.remove("active");
    window.setTimeout(() => settingsView?.classList.add("active"), 150);
  });

  root.querySelector(".side-menu-back")?.addEventListener("click", () => {
    settingsView?.classList.remove("active");
    window.setTimeout(() => {
      mainMenuView?.classList.remove("slide-out");
      mainMenuView?.classList.add("active");
    }, 150);
  });

  root.querySelectorAll(".language-option[data-lang]").forEach((option) => {
    option.addEventListener("click", () => {
      const code = option.getAttribute("data-lang");
      if (!code) return;
      setLanguage(code);
      render();
    });
  });

  root.querySelector("#changeLanguageBtn")?.addEventListener("click", () => {
    closeMenu();
    location.hash = "#/lang";
  });

  root.querySelector("#replayOnboardingBtn")?.addEventListener("click", () => {
    setOnboardingSeen(false);
    closeMenu();
    location.hash = "#/onboarding";
  });

  registerCleanup(() => {
    audio.pause();
    if (scrollTimeout) window.clearTimeout(scrollTimeout);
  });
}

function getLanguageCodes() {
  return ["en", "zh", "es"];
}

function getOrderedLanguageCodes(currentLang) {
  return [currentLang, ...getLanguageCodes().filter((code) => code !== currentLang)];
}

function getLanguageOptionLabels(targetLang, uiLang) {
  if (uiLang === DEFAULT_LANG) {
    return {
      primary: getLanguageLabel(targetLang, DEFAULT_LANG),
      secondary: getLanguageLabel(targetLang, targetLang)
    };
  }

  return {
    primary: getLanguageLabel(targetLang, uiLang),
    secondary: getLanguageLabel(targetLang, DEFAULT_LANG)
  };
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
