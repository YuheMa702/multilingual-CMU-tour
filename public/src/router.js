import { render } from "./render.js";
import { state } from "./state.js";

export function initRouter() {
  window.addEventListener("hashchange", () => {
    applyRoute();
    render(state);
  });

  applyRoute();
}

function applyRoute() {
  const hash = location.hash.replace(/^#/, "");
  const parts = hash.split("/").filter(Boolean);

  // Routes:
  // #/lang
  // #/onboarding
  // #/main
  const route = parts[0] || "lang";

  if (route === "lang") {
    // no-op
    return;
  }

  if (route === "onboarding") return;
  if (route === "main") return;

  // Unknown route -> go to language
  location.hash = "#/lang";
}
