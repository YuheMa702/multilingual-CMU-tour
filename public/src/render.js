import {
  DEFAULT_LANG,
  DEFAULT_STOP_ID,
  buildMainRoute,
  getLanguageLabel,
  getStopName,
  getUiText
} from "./content-manifest.js";
import { getStops, loadTourView } from "./content-service.js";
import { clearViewCleanup, nextRenderToken, registerCleanup, setLanguage, setOnboardingSeen, state } from "./state.js";

export async function render() {
  clearViewCleanup();

  const root = document.getElementById("app");
  const token = nextRenderToken();
  const route = state.route?.name || "lang";

  if (route === "lang") return renderLang(root);
  if (route === "onboarding") return renderOnboarding(root);
  if (route === "main") return renderMain(root, token);

  root.innerHTML = `<div class="center"><div class="card">Unknown route.</div></div>`;
}

function renderLang(root) {
  const uiLang = state.lang || DEFAULT_LANG;
  const t = getUiText(uiLang);

  root.innerHTML = `
    <div class="center">
      <div class="card lang-card" aria-label="Language selection">
        <div class="eyebrow">${escapeHtml(t.prototypeLabel)}</div>
        <h1>${escapeHtml(t.selectLanguageHeading)}</h1>
        <p>${escapeHtml(t.selectLanguageBody)}</p>
        <div class="button-row stacked">
          ${["en", "zh", "es"].map((lang) => `
            <button class="lang-button ${uiLang === lang ? "selected" : ""}" data-lang="${lang}">
              <span>${escapeHtml(getLanguageLabel(lang, uiLang))}</span>
            </button>
          `).join("")}
        </div>
      </div>
    </div>
  `;

  root.querySelectorAll("button[data-lang]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const lang = btn.getAttribute("data-lang");
      setLanguage(lang);
      const seen = localStorage.getItem("onboardingSeen") === "1";
      state.onboardingSeen = seen;
      location.hash = seen ? buildMainRoute(DEFAULT_STOP_ID, "intro") : "#/onboarding";
    });
  });
}

function renderOnboarding(root) {
  const lang = state.lang || DEFAULT_LANG;
  const t = getUiText(lang);

  root.innerHTML = `
    <div class="center">
      <div class="card" aria-label="Onboarding instructions">
        <div class="eyebrow">${escapeHtml(t.prototypeLabel)}</div>
        <h1>${escapeHtml(t.onboardingTitle)}</h1>
        <p>${escapeHtml(t.onboardingBody)}</p>
        <label class="checkbox-row">
          <input id="dontShow" type="checkbox" ${state.onboardingSeen ? "checked" : ""} />
          <span>${escapeHtml(t.dontShowAgain)}</span>
        </label>
        <div class="button-row">
          <button class="primary" id="continueBtn">${escapeHtml(t.continueLabel)}</button>
          <button id="backBtn">${escapeHtml(t.backLabel)}</button>
        </div>
      </div>
    </div>
  `;

  root.querySelector("#continueBtn").addEventListener("click", () => {
    const dontShow = root.querySelector("#dontShow").checked;
    setOnboardingSeen(dontShow);
    location.hash = buildMainRoute(DEFAULT_STOP_ID, "intro");
  });

  root.querySelector("#backBtn").addEventListener("click", () => {
    location.hash = "#/lang";
  });
}

async function renderMain(root, token) {
  const lang = state.lang || DEFAULT_LANG;
  const t = getUiText(lang);
  const { stopId = DEFAULT_STOP_ID, storyId = "intro" } = state.route || {};

  root.innerHTML = `
    <div class="app-shell">
      <div class="loading-state">${escapeHtml(t.loadingLabel)}</div>
    </div>
  `;

  try {
    const view = await loadTourView(stopId, storyId, lang);
    if (token !== state.renderToken) return;

    root.innerHTML = buildMainMarkup(view, lang, t);
    bindMainInteractions(root, view, lang, t);
  } catch (error) {
    console.error(error);
    if (token !== state.renderToken) return;
    root.innerHTML = `
      <div class="center">
        <div class="card">
          <h1>${escapeHtml(t.loadingErrorTitle)}</h1>
          <p>${escapeHtml(t.loadingErrorBody)}</p>
        </div>
      </div>
    `;
  }
}

function buildMainMarkup(view, lang, t) {
  const stops = getStops();
  const activeSlide = view.slides[0] || "";
  const transcriptItems = view.transcript.map((line, index) => `
    <button class="transcript-line ${index === 0 ? "active" : ""}" type="button" data-time="${line.time}" data-index="${index}">
      <span class="transcript-time">${formatClock(line.time)}</span>
      <span>${escapeHtml(line.text)}</span>
    </button>
  `).join("");

  const storyCards = [
    {
      id: "intro",
      title: t.stopIntroCardTitle,
      description: t.stopIntroCardBody,
      thumbnail: view.slides[0] || "",
      route: buildMainRoute(view.stopId, "intro")
    },
    ...view.relatedStories
  ];

  return `
    <div class="app-shell" data-view-kind="${escapeHtml(view.viewKind)}">
      <header class="topbar">
        <div class="topbar-left">
          <label class="menu-field">
            <span>${escapeHtml(t.chooseStopLabel)}</span>
            <select id="stopSelect" aria-label="${escapeHtml(t.stopMenuAria)}">
              ${stops.map((stop) => `
                <option value="${stop.id}" ${stop.id === view.stopId ? "selected" : ""}>${escapeHtml(getStopName(stop.id, lang))}</option>
              `).join("")}
            </select>
          </label>
        </div>
        <div class="topbar-right">
          <button id="changeLangBtn">${escapeHtml(t.changeLanguage)}</button>
          <button id="resetOnboardingBtn">${escapeHtml(t.resetOnboarding)}</button>
        </div>
      </header>

      <section class="hero-panel panel">
        <div class="panel-header">
          <div>
            <div class="eyebrow">${escapeHtml(t.currentViewLabel)}</div>
            <h1>${escapeHtml(view.viewTitle)}</h1>
            ${view.viewDescription ? `<p>${escapeHtml(view.viewDescription)}</p>` : ""}
          </div>
          ${view.viewKind === "story" ? `<button class="primary" id="backToIntroBtn">${escapeHtml(t.backToIntro)}</button>` : ""}
        </div>

        <div class="story-chip-row">
          <button class="story-chip ${view.activeCardId === "intro" ? "selected" : ""}" data-route="${buildMainRoute(view.stopId, "intro")}">${escapeHtml(t.introChip)}</button>
          ${view.relatedStories.map((story) => `
            <button class="story-chip ${view.activeCardId === story.id ? "selected" : ""}" data-route="${story.route}">${escapeHtml(story.title)}</button>
          `).join("")}
        </div>

        ${view.usingPlaceholderStoryMedia ? `<div class="notice-banner">${escapeHtml(t.placeholderStoryNotice)}</div>` : ""}

        <div class="hero-stage">
          <div class="slide-frame">
            ${activeSlide
              ? `<img id="slideImage" src="${escapeHtml(activeSlide)}" alt="${escapeHtml(view.viewTitle)} slide 1" />`
              : `<div class="image-placeholder">${escapeHtml(t.imageSlidesTitle)}</div>`}
          </div>

          <div class="slide-controls">
            <button class="slide-nav" id="prevSlideBtn" aria-label="${escapeHtml(t.previousSlide)}">‹</button>
            <div class="slide-dots" id="slideDots">
              ${view.slides.map((_, index) => `
                <button
                  class="slide-dot ${index === 0 ? "active" : ""}"
                  data-index="${index}"
                  aria-label="Slide ${index + 1}"
                  type="button">
                </button>
              `).join("")}
            </div>
            <button class="slide-nav" id="nextSlideBtn" aria-label="${escapeHtml(t.nextSlide)}">›</button>
          </div>
        </div>
      </section>

      <section class="player-panel panel">
        <div class="player-column">
          <div class="section-title">${escapeHtml(t.audioTitle)}</div>
          <audio id="tourAudio" controls preload="metadata" src="${escapeHtml(view.audioSrc)}"></audio>
          ${view.usingPlaceholderTranscript ? `<div class="notice-banner subtle">${escapeHtml(t.placeholderTranscriptNotice)}</div>` : ""}
          <p class="helper-text">${escapeHtml(t.transcriptJumpHint)}</p>
        </div>
        <div class="transcript-column">
          <div class="section-title">${escapeHtml(t.transcriptTitle)}</div>
          <div id="transcriptList" class="transcript-list">
            ${transcriptItems}
          </div>
        </div>
      </section>

      <section class="stories-panel panel">
        <div class="panel-header compact">
          <div>
            <div class="section-title">${escapeHtml(t.relatedStoriesTitle)}</div>
            <p>${escapeHtml(t.storiesDescription)}</p>
          </div>
        </div>
        <div class="stories-grid">
          ${storyCards.map((card) => `
            <article class="story-card ${card.id === view.activeCardId ? "selected" : ""}">
              <button class="story-card-button" type="button" data-route="${card.route}">
                <div class="story-thumb-wrap">
                  ${card.thumbnail
                    ? `<img src="${escapeHtml(card.thumbnail)}" alt="${escapeHtml(card.title)}" class="story-thumb" />`
                    : `<div class="story-thumb placeholder"></div>`}
                </div>
                <div class="story-copy">
                  <h3>${escapeHtml(card.title)}</h3>
                  <p>${escapeHtml(card.description)}</p>
                </div>
              </button>
            </article>
          `).join("") || `<p>${escapeHtml(t.noStoriesLabel)}</p>`}
        </div>
      </section>
    </div>
  `;
}


function bindMainInteractions(root, view, lang, t) {
  const audio = root.querySelector("#tourAudio");
  const transcriptButtons = [...root.querySelectorAll(".transcript-line")];
  const transcriptList = root.querySelector("#transcriptList");
  const slideImage = root.querySelector("#slideImage");
  const dotButtons = [...root.querySelectorAll(".slide-dot")];
  const slideSources = view.slides.length ? view.slides : [""];
  let slideIndex = 0;
  let lastTranscriptIndex = -1;

  const updateSlide = (index) => {
    if (!slideSources.length) return;

    slideIndex = ((index % slideSources.length) + slideSources.length) % slideSources.length;

    if (slideImage) {
      slideImage.src = slideSources[slideIndex];
      slideImage.alt = `${view.viewTitle} slide ${slideIndex + 1}`;
    }

    dotButtons.forEach((btn, idx) => {
      btn.classList.toggle("active", idx === slideIndex);
    });
  };

  const advanceSlide = (delta) => updateSlide(slideIndex + delta);

  if (dotButtons.length) {
    dotButtons.forEach((btn) => {
      btn.addEventListener("click", () => updateSlide(Number(btn.dataset.index || 0)));
    });
  }

  root.querySelector("#prevSlideBtn")?.addEventListener("click", () => advanceSlide(-1));
  root.querySelector("#nextSlideBtn")?.addEventListener("click", () => advanceSlide(1));

  if (slideSources.length > 1) {
    const intervalId = window.setInterval(() => advanceSlide(1), 4500);
    registerCleanup(() => window.clearInterval(intervalId));
  }

  root.querySelector("#stopSelect")?.addEventListener("change", (event) => {
    const stopId = event.target.value;
    location.hash = buildMainRoute(stopId, "intro");
  });

  root.querySelector("#changeLangBtn")?.addEventListener("click", () => {
    location.hash = "#/lang";
  });

  root.querySelector("#resetOnboardingBtn")?.addEventListener("click", () => {
    setOnboardingSeen(false);
    location.hash = "#/onboarding";
  });

  root.querySelector("#backToIntroBtn")?.addEventListener("click", () => {
    location.hash = buildMainRoute(view.stopId, "intro");
  });

  root.querySelectorAll("[data-route]").forEach((node) => {
    node.addEventListener("click", () => {
      const route = node.getAttribute("data-route");
      if (route) location.hash = route;
    });
  });

  const setActiveTranscript = (activeIndex, forceCenter = false) => {
    if (!transcriptButtons.length || !transcriptList) return;

    transcriptButtons.forEach((btn, index) => {
      const isActive = index === activeIndex;
      btn.classList.toggle("active", isActive);
      btn.setAttribute("aria-current", isActive ? "true" : "false");
    });

    const activeButton = transcriptButtons[activeIndex];
    if (!activeButton) return;

    requestAnimationFrame(() => {
      activeButton.scrollIntoView({
        behavior: "auto",
        block: forceCenter ? "center" : "nearest",
        inline: "nearest"
      });
    });
  };

  transcriptButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      if (!audio) return;

      const index = Number(btn.dataset.index || 0);
      const targetTime = Number(btn.dataset.time || 0);

      lastTranscriptIndex = index;
      setActiveTranscript(index, true);

      audio.currentTime = targetTime;
      audio.play().catch(() => {});
    });
  });

  const syncTranscript = () => {
    if (!audio || !transcriptButtons.length) return;

    const currentTime = audio.currentTime || 0;
    let activeIndex = 0;

    for (let i = 0; i < view.transcript.length; i += 1) {
      if (view.transcript[i].time <= currentTime) {
        activeIndex = i;
      } else {
        break;
      }
    }

    if (activeIndex !== lastTranscriptIndex) {
      lastTranscriptIndex = activeIndex;
      setActiveTranscript(activeIndex, false);
    }
  };

  audio?.addEventListener("timeupdate", syncTranscript);
  audio?.addEventListener("seeking", syncTranscript);
  audio?.addEventListener("loadedmetadata", syncTranscript);
  audio?.addEventListener("play", syncTranscript);

  registerCleanup(() => {
    audio?.pause();
    audio?.removeEventListener("timeupdate", syncTranscript);
    audio?.removeEventListener("seeking", syncTranscript);
    audio?.removeEventListener("loadedmetadata", syncTranscript);
    audio?.removeEventListener("play", syncTranscript);
  });

  syncTranscript();
}


function formatClock(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}