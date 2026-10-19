import {initializeContent} from './content-manifest.js';
import {initRouter} from './router.js';
import {render} from './render.js';

async function boot() {
  try {
    await initializeContent(); // Metadata MUST be available before routing and rendering.
    initRouter();
    if (!location.hash) location.hash = '#/lang';
    await render();
  } catch (error) {
    console.error('Could not initialize tour', error);
    const root = document.getElementById('app');
    if (root) root.textContent = `Unable to load tour content. Run node scripts/build-content.mjs and reload. ${error.message}`;
  }
}
boot();
