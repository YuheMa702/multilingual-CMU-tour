/**
 * Idempotent one-time patch against the EXISTING migrated render.js.
 * It preserves your carousel fix, language behavior, onboarding, and styling.
 * Usage: node scripts/patch-transcript-stability.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const target = path.join(root, 'public/src/render.js');
if (!fs.existsSync(target)) throw new Error(`Could not find ${target}`);
let source = fs.readFileSync(target, 'utf8');
const original = source;

// Avoid partial writes on unrecognized renderer versions.
const importLine = 'import { createTranscriptView } from "./transcript-view.js";';
const syncAnchor = '  function syncLyricsToTime() {';
const renderAnchor = '  function renderLyrics(forceUpdate = false) {';
const oldScroll = `  lyricsScroll?.addEventListener("scroll", () => {
    if (!lyricsPlayer.classList.contains("enlarged")) return;
    userIsScrolling = true;
    if (scrollTimeout) window.clearTimeout(scrollTimeout);
    scrollTimeout = window.setTimeout(() => {
      userIsScrolling = false;
      renderLyrics(true);
    }, 1800);
  });`;
const newScroll = `  // Detect user input rather than scroll events: internal auto-follow also
  // fires scroll events and must NOT be mistaken for a manual swipe.
  function pauseTranscriptAutoFollow() {
    if (!lyricsPlayer.classList.contains("enlarged")) return;
    userIsScrolling = true;
    if (scrollTimeout) window.clearTimeout(scrollTimeout);
    scrollTimeout = window.setTimeout(() => {
      userIsScrolling = false;
    }, 2500);
  }
  lyricsScroll?.addEventListener("touchstart", pauseTranscriptAutoFollow, { passive: true });
  lyricsScroll?.addEventListener("wheel", pauseTranscriptAutoFollow, { passive: true });
  lyricsScroll?.addEventListener("pointerdown", pauseTranscriptAutoFollow, { passive: true });
  lyricsScroll?.addEventListener("keydown", pauseTranscriptAutoFollow);`;

const newRender = `  // One presenter per audio view; the carousel remains independent.
  const transcriptView = createTranscriptView({
    container: lyrics,
    scroller: lyricsScroll,
    cues: transcript,
    emptyText: ui.noTranscriptLabel,
    onSelect(index, time) {
      currentLine = index;
      audio.currentTime = time;
      audio.play().catch(() => {});
      renderLyrics(true);
    }
  });

  function renderLyrics(forceUpdate = false) {
    transcriptView.render(currentLine, {
      expanded: lyricsPlayer.classList.contains("enlarged"),
      follow: !userIsScrolling || forceUpdate,
      forceScroll: forceUpdate
    });
  }

`;

if (source.includes('const transcriptView = createTranscriptView({') && source.includes(newScroll)) {
  console.log('Transcript stability fix already applied; no changes needed.');
  process.exit(0);
}
if (source.includes('const transcriptView = createTranscriptView({') || source.includes(importLine)) {
  throw new Error('Partial transcript patch detected. No files written. Inspect render.js.');
}
if (!source.includes(renderAnchor) || !source.includes(syncAnchor) || !source.includes(oldScroll)) {
  throw new Error('Unexpected render.js version. No files written; check that previous patches were applied.');
}
const start = source.indexOf(renderAnchor);
const end = source.indexOf(syncAnchor, start);
if (end < start || !source.slice(start, end).includes('scrollIntoView(')) {
  throw new Error('Original transcript function not found exactly where expected; no files written.');
}
if (!source.includes('from "./state.js";\n')) {
  throw new Error('State import not found; no files written.');
}
source = source.replace('from "./state.js";\n', `from "./state.js";\n${importLine}\n`);
const start2 = source.indexOf(renderAnchor);
const end2 = source.indexOf(syncAnchor, start2);
source = source.slice(0, start2) + newRender + source.slice(end2);
source = source.replace(oldScroll, newScroll);

if (source.includes('scrollIntoView(')) {
  throw new Error('Unexpected remaining scrollIntoView() call; no files written.');
}
if (source === original) throw new Error('No update was applied.');
const backup = target + '.pre-transcript-stability-backup';
if (!fs.existsSync(backup)) fs.copyFileSync(target, backup);
fs.writeFileSync(target, source, 'utf8');
const ignorePath = path.join(root, '.gitignore');
const ignoreEntry = 'public/src/render.js.pre-transcript-stability-backup';
const ignored = fs.existsSync(ignorePath) ? fs.readFileSync(ignorePath, 'utf8') : '';
if (!ignored.split(/\r?\n/).includes(ignoreEntry)) {
  fs.appendFileSync(ignorePath, (ignored.endsWith('\n') || !ignored ? '' : '\n') + ignoreEntry + '\n');
}
console.log('Updated public/src/render.js; existing source backed up to render.js.pre-transcript-stability-backup');
