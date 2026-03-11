import { state } from "./state.js";

export function render() {
  const root = document.getElementById("app");
  const hash = location.hash.replace(/^#/, "");
  const parts = hash.split("/").filter(Boolean);
  const route = parts[0] || "lang";

  if (route === "lang") return renderLang(root);
  if (route === "onboarding") return renderOnboarding(root);
  if (route === "main") return renderMain(root);

  root.innerHTML = `<div class="center"><div class="card">Unknown route.</div></div>`;
}

function renderLang(root) {
  root.innerHTML = `
    <div class="center">
      <div class="card" aria-label="Language selection">
        <h1>Select your language</h1>
        <p>Choose a language to begin the CMU campus tour experience.</p>
        <div class="button-row">
          <button class="primary" data-lang="en">English</button>
          <button data-lang="zh">中文</button>
          <button data-lang="es">Español</button>
        </div>
        <p class="small" style="margin-top:12px;">Prototype build (Week 1).</p>
      </div>
    </div>
  `;

  root.querySelectorAll("button[data-lang]").forEach(btn => {
    btn.addEventListener("click", () => {
      state.lang = btn.getAttribute("data-lang");
      const seen = localStorage.getItem("onboardingSeen") === "1";
      state.onboardingSeen = seen;
      location.hash = seen ? "#/main" : "#/onboarding";
    });
  });
}

function renderOnboarding(root) {
  root.innerHTML = `
    <div class="center">
      <div class="card" aria-label="Onboarding instructions">
        <h1>How this tour works</h1>
        <p>
          Each stop includes an intro video and a synchronized transcript.
          You can pause, seek, or skip at any time. You can also explore related student stories for each stop.
        </p>
        <label class="small" style="display:flex; gap:10px; align-items:center; margin: 14px 0;">
          <input id="dontShow" type="checkbox" />
          Don’t show this again
        </label>
        <div class="button-row">
          <button class="primary" id="continueBtn">Continue</button>
          <button id="backBtn">Back</button>
        </div>
      </div>
    </div>
  `;

  root.querySelector("#continueBtn").addEventListener("click", () => {
    const dontShow = root.querySelector("#dontShow").checked;
    if (dontShow) localStorage.setItem("onboardingSeen", "1");
    location.hash = "#/main";
  });

  root.querySelector("#backBtn").addEventListener("click", () => {
    location.hash = "#/lang";
  });
}

function renderMain(root) {
  const lang = state.lang || "en";
  root.innerHTML = `
    <div class="center">
      <div class="card" aria-label="Main page placeholder">
        <h1>Main page (placeholder)</h1>
        <p>Language: <strong>${escapeHtml(lang)}</strong></p>
        <p>Week 1 goal: routing + embedding + scaffolding.</p>
        <div class="button-row">
          <button id="resetBtn">Reset onboarding</button>
          <button id="changeLangBtn">Change language</button>
        </div>
      </div>
    </div>
  `;

  root.querySelector("#resetBtn").addEventListener("click", () => {
    localStorage.removeItem("onboardingSeen");
    location.hash = "#/onboarding";
  });
  root.querySelector("#changeLangBtn").addEventListener("click", () => {
    location.hash = "#/lang";
  });
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
