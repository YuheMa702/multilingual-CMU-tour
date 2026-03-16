import { DEFAULT_STOP_ID, buildMainRoute } from "./content-manifest.js";
import { isValidStop, isValidStory } from "./content-service.js";
import { render } from "./render.js";
import { state } from "./state.js";

export function initRouter() {
  window.addEventListener("hashchange", () => {
    applyRoute();
    render();
  });

  applyRoute();
}

function applyRoute() {
  state.lang = localStorage.getItem("mcmu.lang") || state.lang || null;
  state.onboardingSeen = localStorage.getItem("onboardingSeen") === "1";

  const hash = location.hash.replace(/^#/, "");
  const parts = hash.split("/").filter(Boolean);
  const route = parts[0] || getDefaultRoute();

  if (!state.lang && route !== "lang") {
    redirect("#/lang");
    return;
  }

  if (route === "lang") {
    state.route = { name: "lang", stopId: null, storyId: "intro" };
    return;
  }

  if (route === "onboarding") {
    state.route = { name: "onboarding", stopId: null, storyId: "intro" };
    return;
  }

  if (route === "main") {
    const requestedStopId = parts[1] || DEFAULT_STOP_ID;
    const stopId = isValidStop(requestedStopId) ? requestedStopId : DEFAULT_STOP_ID;
    let storyId = "intro";

    if (parts[2] === "story" && parts[3] && isValidStory(parts[3])) {
      storyId = parts[3];
    }

    const normalizedHash = buildMainRoute(stopId, storyId);
    if (location.hash !== normalizedHash) {
      redirect(normalizedHash);
      return;
    }

    state.route = { name: "main", stopId, storyId };
    return;
  }

  redirect(getDefaultHash());
}

function getDefaultRoute() {
  if (!state.lang) return "lang";
  return state.onboardingSeen ? "main" : "onboarding";
}

function getDefaultHash() {
  if (!state.lang) return "#/lang";
  return state.onboardingSeen ? buildMainRoute(DEFAULT_STOP_ID, "intro") : "#/onboarding";
}

function redirect(hash) {
  if (location.hash === hash) return;
  location.replace(hash);
}