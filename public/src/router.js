import {DEFAULT_STOP_ID, buildMainRoute, getLanguageCodes} from './content-manifest.js';
import {isValidStop, isValidStory} from './content-service.js';
import {render} from './render.js';
import {state} from './state.js';

export function initRouter() {
  window.addEventListener('hashchange', () => { applyRoute(); render(); });
  applyRoute();
}
function applyRoute() {
  try { state.lang = localStorage.getItem('mcmu.lang') || state.lang || null; } catch { /* unavailable */ }
  // A previously saved language may have been disabled in ui.json.
  if (state.lang && !getLanguageCodes().includes(state.lang)) {
    state.lang = null;
    try { localStorage.removeItem('mcmu.lang'); } catch { /* unavailable */ }
  }
  try { state.onboardingSeen = localStorage.getItem('onboardingSeen') === '1'; } catch { /* unavailable */ }
  const parts = location.hash.replace(/^#/, '').split('/').filter(Boolean);
  const route = parts[0] || getDefaultRoute();
  if (!state.lang && route !== 'lang') return redirect('#/lang');
  if (route === 'lang' || route === 'onboarding') {
    state.route = {name: route, stopId:null, storyId:'intro'}; return;
  }
  if (route === 'main') {
    const candidateStopId = decodeSafe(parts[1] || DEFAULT_STOP_ID);
    const stopId = isValidStop(candidateStopId) ? candidateStopId : DEFAULT_STOP_ID;
    const candidateStoryId = parts[2] === 'story' ? decodeSafe(parts[3] || '') : '';
    const storyId = isValidStory(candidateStoryId, state.lang) && candidateStoryId ? candidateStoryId : 'intro';
    const normalized = buildMainRoute(stopId, storyId);
    if (location.hash !== normalized) return redirect(normalized);
    state.route = {name:'main',stopId,storyId}; return;
  }
  redirect(getDefaultHash());
}
function decodeSafe(value) {try{return decodeURIComponent(value);}catch{return '';}}
function getDefaultRoute() {return !state.lang ? 'lang' : state.onboardingSeen ? 'main' : 'onboarding';}
function getDefaultHash() {return !state.lang ? '#/lang' : state.onboardingSeen ? buildMainRoute(DEFAULT_STOP_ID) : '#/onboarding';}
function redirect(hash) {if (location.hash !== hash) location.replace(hash);}
