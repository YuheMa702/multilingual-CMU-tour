/**
 * One-time, idempotent patch for the ALREADY-MIGRATED public/src/render.js.
 * Applies a minimal renderer integration without replacing unrelated UI logic.
 * Usage (from project root): node scripts/patch-story-carousel.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const target = path.join(root, 'public/src/render.js');
if (!fs.existsSync(target)) throw new Error(`Missing ${target}. Place the update in your repository root.`);
let source = fs.readFileSync(target, 'utf8');
const original = source;

function patch(before, after, label) {
  if (source.includes(after)) return;
  if (!source.includes(before)) {
    throw new Error(`${label}: expected renderer text not found. No changes written; inspect render.js and contact the maintainer.`);
  }
  source = source.replace(before, after);
}

// 1. Import the reusable carousel controller.
patch(
  'from "./state.js";\n',
  'from "./state.js";\nimport { canReuseStoryCarousel, updatePreservingStoryCarousel } from "./story-carousel.js";\n',
  'import story carousel helper'
);

// 2. Associate a mounted carousel with the UI language and stop.
patch(
  'class="content-container" data-view-kind="${escapeHtml(view.viewKind)}"',
  'class="content-container" data-view-kind="${escapeHtml(view.viewKind)}" data-language="${escapeHtml(lang)}" data-stop-id="${escapeHtml(view.stopId)}"',
  'content attributes'
);
patch(
  'type="button" data-route="${escapeHtml(card.route)}"',
  'type="button" data-story-id="${escapeHtml(card.id)}" data-route="${escapeHtml(card.route)}"',
  'story identity attributes'
);

// 3. Keep the existing main view visible while a story's transcript loads.
const loadingBefore = `  root.innerHTML = \`\n    <div class="app-page centered-page detail-page-shell">\n      <div class="phone-shell detail-shell">\n        <div class="loading-state">\${escapeHtml(ui.loadingLabel)}</div>\n      </div>\n    </div>\n  \`;`;
const loadingAfter = `  // Keeping the same-language carousel mounted also preserves touch momentum.\n  const reuseStoryCarousel = canReuseStoryCarousel(root, lang);\n  if (!reuseStoryCarousel) {\n${loadingBefore.split('\n').map(line => '  ' + line).join('\n')}\n  }`;
patch(loadingBefore, loadingAfter, 'main loading placeholder');

// 4. Change only the other parts of the page when navigating between stories.
patch(
  '    root.innerHTML = buildMainMarkup(view, lang);\n    bindMainInteractions(root, view, lang);',
  `    const markup = buildMainMarkup(view, lang);\n    const preserved = reuseStoryCarousel && updatePreservingStoryCarousel(root, markup, view, lang);\n    if (!preserved) root.innerHTML = markup;\n    bindMainInteractions(root, view, lang, preserved);`,
  'main view update'
);

// 5. Do not attach second event handlers to the preserved carousel.
patch(
  'function bindMainInteractions(root, view, lang) {',
  'function bindMainInteractions(root, view, lang, preservedStoryCarousel = false) {',
  'interaction binder signature'
);
const linksBefore = `  root.querySelectorAll("[data-route]").forEach((node) => {\n    node.addEventListener("click", () => {\n      const route = node.getAttribute("data-route");\n      if (route) location.hash = route;\n    });\n  });`;
patch(linksBefore, `  if (!preservedStoryCarousel) {\n${linksBefore.split('\n').map(line => '  ' + line).join('\n')}\n  }`, 'story link handlers');
const scrollBefore = `  root.querySelector("#storiesScrollLeftBtn")?.addEventListener("click", () => scrollStories(-1));\n  root.querySelector("#storiesScrollRightBtn")?.addEventListener("click", () => scrollStories(1));`;
patch(scrollBefore, `  if (!preservedStoryCarousel) {\n${scrollBefore.split('\n').map(line => '  ' + line).join('\n')}\n  }`, 'scroll button handlers');

if (source === original) {
  console.log('Story carousel persistence is already installed. No changes needed.');
} else {
  const backup = target + '.pre-story-scroll-backup';
  if (!fs.existsSync(backup)) fs.copyFileSync(target, backup);
  fs.writeFileSync(target, source);
  // Prevent the one-time backup from being committed accidentally.
  const ignorePath = path.join(root, '.gitignore');
  const ignoreEntry = 'public/src/render.js.pre-story-scroll-backup';
  const existingIgnore = fs.existsSync(ignorePath) ? fs.readFileSync(ignorePath, 'utf8') : '';
  if (!existingIgnore.split(/\r?\n/).includes(ignoreEntry)) {
    fs.appendFileSync(ignorePath, (existingIgnore.endsWith('\n') || !existingIgnore ? '' : '\n') + ignoreEntry + '\n');
  }
  console.log('Patched public/src/render.js; original backed up to render.js.pre-story-scroll-backup');
}
