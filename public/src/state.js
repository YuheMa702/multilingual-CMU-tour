function storageGet(key) {
  try {
    return typeof localStorage !== "undefined" ? localStorage.getItem(key) : null;
  } catch {
    return null;
  }
}

function storageSet(key, value) {
  try {
    if (typeof localStorage !== "undefined") localStorage.setItem(key, value);
  } catch {
    // no-op
  }
}

function storageRemove(key) {
  try {
    if (typeof localStorage !== "undefined") localStorage.removeItem(key);
  } catch {
    // no-op
  }
}

export const state = {
  lang: storageGet("mcmu.lang") || null,
  onboardingSeen: storageGet("onboardingSeen") === "1",
  route: { name: "lang", stopId: null, storyId: "intro" },
  cleanupFns: [],
  renderToken: 0
};

export function setLanguage(lang) {
  state.lang = lang;
  if (lang) storageSet("mcmu.lang", lang);
}

export function setOnboardingSeen(seen) {
  state.onboardingSeen = Boolean(seen);
  if (seen) {
    storageSet("onboardingSeen", "1");
  } else {
    storageRemove("onboardingSeen");
  }
}

export function clearViewCleanup() {
  for (const fn of state.cleanupFns.splice(0)) {
    try {
      fn();
    } catch {
      // no-op
    }
  }
}

export function registerCleanup(fn) {
  if (typeof fn === "function") state.cleanupFns.push(fn);
}

export function nextRenderToken() {
  state.renderToken += 1;
  return state.renderToken;
}