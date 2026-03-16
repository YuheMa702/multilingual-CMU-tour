import { initRouter } from "./router.js";
import { render } from "./render.js";
import { state } from "./state.js";

function boot() {
  initRouter();

  // Initial route
  if (!location.hash) location.hash = "#/lang";
  render(state);
}

boot();