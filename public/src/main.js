import { initializeContent } from "./content-manifest.js";
import { initRouter } from "./router.js";
import { render } from "./render.js";
import { state } from "./state.js";

function prepareInitialRoute() {
  // Opening the public demo URL with no #/route starts a new visit.
  // Show language selection even if a visitor chose a language previously.
  // Keep explicit deep links (#/main/...) working as before.
  if (location.hash && location.hash !== "#") return;

  state.lang = null;
  try {
    localStorage.removeItem("mcmu.lang");
  } catch {
    // Storage may be disabled; the language selection page still works.
  }

  // Set the initial route BEFORE initRouter() reads it. replaceState avoids
  // an extra history entry and doesn't trigger a second hashchange render.
  history.replaceState(null, "", `${location.pathname}${location.search}#/lang`);
}

async function boot() {
  try {
    await initializeContent();
    prepareInitialRoute();
    initRouter();
    await render();
  } catch (error) {
    console.error("Could not initialize tour", error);
    const root = document.getElementById("app");
    if (root) {
      root.textContent = `Unable to load tour content. Run node scripts/build-content.mjs and reload. ${error.message}`;
    }
  }
}

boot();
