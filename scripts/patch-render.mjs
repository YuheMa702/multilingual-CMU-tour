/**
 * Apply small, idempotent updates to the existing renderer.
 * Safe to run whether or not the earlier content migration was applied.
 * Keeps the rest of render.js (and all existing CSS) intact.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const target = path.join(root, 'public/src/render.js');
if (!fs.existsSync(target)) {
  throw new Error(`Missing ${target}. Apply this package over your original repository.`);
}
let source = fs.readFileSync(target, 'utf8');
const original = source;

function replaceOnce(before, after, label) {
  if (source.includes(after) || (label === 'story card list' && source.includes('const storyCards = view.relatedStories;'))) return; // already applied
  if (!source.includes(before)) {
    throw new Error(`${label}: expected renderer code not found. No file was modified. Please inspect your local render.js before applying this patch.`);
  }
  source = source.replace(before, after);
}

// Original content-migration changes: can safely run on either the old or new renderer.
replaceOnce('  getLanguageLabel,\n', '  getLanguageLabel,\n  getLanguageCodes as getMetadataLanguageCodes,\n', 'metadata language import');
replaceOnce(
  `  const introRoute = buildMainRoute(view.stopId, "intro");\n  const storyCards = [\n    {\n      id: "intro",\n      title: ui.mainIntroductionTitle,\n      description: ui.mainIntroductionDescription,\n      thumbnail: view.relatedStories[0]?.thumbnail || view.slides[0] || "",\n      route: introRoute\n    },\n    ...view.relatedStories\n  ];`,
  `  // Stop narration is not a student story; Back to Introduction is kept on story pages.\n  const storyCards = view.relatedStories;`,
  'story card list'
);
replaceOnce(`function getLanguageCodes() {\n  return ["en", "zh", "es"];\n}`, `function getLanguageCodes() {\n  return getMetadataLanguageCodes();\n}`, 'language options');
replaceOnce(`aria-label="Scroll stories left"`, `aria-label="\${escapeHtml(ui.scrollStoriesLeft)}"`, 'left story scroll label');
replaceOnce(`aria-label="Scroll stories right"`, `aria-label="\${escapeHtml(ui.scrollStoriesRight)}"`, 'right story scroll label');

// A language switch from an unavailable story should return to that stop's intro.
replaceOnce(
  `import { getStops, loadTourView } from "./content-service.js";`,
  `import { getStops, isValidStory, loadTourView } from "./content-service.js";`,
  'language-aware story import'
);
replaceOnce(
  `      setLanguage(code);\n      render();\n    });`,
  `      setLanguage(code);\n      if (view.viewKind === "story" && !isValidStory(view.storyId, code)) {\n        location.hash = buildMainRoute(view.stopId, "intro");\n        return;\n      }\n      render();\n    });`,
  'language-switch behavior'
);

// Avoid stale transition timeouts and use one outgoing/one incoming slide.
replaceOnce(
  `  let introIndex = 0;\n  let introTimer = null;\n\n  function showIntro(index) {\n    slides.forEach((slide, idx) => {\n      slide.classList.remove("active", "leaving");\n      if (idx === index) return;\n      if (slide.dataset.wasActive === "1") {\n        slide.classList.add("leaving");\n        window.setTimeout(() => slide.classList.remove("leaving"), 600);\n      }\n      slide.dataset.wasActive = "0";\n    });\n\n    const active = slides[index];\n    if (active) {\n      active.classList.add("active");\n      active.dataset.wasActive = "1";\n    }\n  }`,
  `  let introIndex = 0;\n  let introTimer = null;\n  let exitTimer = null;\n\n  function showIntro(index) {\n    const next = slides[index];\n    if (!next) return;\n    const previous = slides.find(slide => slide.classList.contains("active"));\n    if (previous === next) return;\n    if (exitTimer) window.clearTimeout(exitTimer);\n\n    slides.forEach(slide => slide.classList.remove("active", "leaving"));\n    if (previous) {\n      previous.classList.add("leaving");\n      exitTimer = window.setTimeout(() => {\n        previous.classList.remove("leaving");\n        exitTimer = null;\n      }, 480);\n    }\n    next.classList.add("active");\n  }`,
  'onboarding transition'
);
replaceOnce(
  `  registerCleanup(() => {\n    if (introTimer) window.clearInterval(introTimer);\n  });`,
  `  registerCleanup(() => {\n    if (introTimer) window.clearInterval(introTimer);\n    if (exitTimer) window.clearTimeout(exitTimer);\n  });`,
  'onboarding cleanup'
);

if (!source.includes('const storyCards = view.relatedStories;') || !source.includes('isValidStory(view.storyId, code)')) {
  throw new Error('Renderer verification failed. Original file has not been modified.');
}
if (source !== original) {
  // An existing .pre-metadata-backup is preserved rather than overwritten.
  const backup = target + '.pre-ui-fixes-backup';
  if (!fs.existsSync(backup)) fs.copyFileSync(target, backup);
  fs.writeFileSync(target, source, 'utf8');
  console.log('Updated public/src/render.js; original preserved in .pre-ui-fixes-backup');
} else {
  console.log('Renderer already updated. No changes needed.');
}
