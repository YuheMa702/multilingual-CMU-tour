import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createTranscriptView} from '../public/src/transcript-view.js';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

class ClassList {
  constructor(el) { this.el = el; }
  contains(value) { return this.el.className.split(/\s+/).includes(value); }
  add(value) { if (!this.contains(value)) this.el.className += ' ' + value; }
  remove(value) { this.el.className = this.el.className.split(/\s+/).filter(t => t !== value).join(' '); }
}
class Element {
  constructor(tag, doc) {
    this.tagName = tag.toUpperCase();
    this.ownerDocument = doc;
    this.className = '';
    this.classList = new ClassList(this);
    this.dataset = {};
    this.children = [];
    this.listeners = {};
    this.textContent = '';
    this.scrollTop = 0;
    this.clientHeight = 285;
    this.replaceCount = 0;
  }
  replaceChildren(...children) { this.children = children; this.replaceCount++; children.forEach(x => x.parentElement = this); }
  addEventListener(name, callback) { this.listeners[name] ??= []; this.listeners[name].push(callback); }
  click() { for (const cb of (this.listeners.click || [])) cb(); }
  getBoundingClientRect() {
    if (this.tagName === 'SCROLLER') return {top: 200, height: 285};
    const index = Number(this.dataset.index || 0);
    return {top: 210 + 48 * index - (this.parentElement?.scrollTop || 0), height: 40};
  }
}
function fixture(lines = [{time: 0, text: 'Welcome'}, {time: 5, text: 'Research at CMU'}, {time: 10, text: 'Finish'}]) {
  const doc = { createElement: tag => new Element(tag, doc) };
  const container = new Element('div', doc);
  const scroller = new Element('scroller', doc);
  let clicked = [];
  const view = createTranscriptView({container, scroller, cues: lines, emptyText: 'Unavailable', onSelect: (...args) => clicked.push(args)});
  return {view, container, scroller, clicked};
}

test('compact mode mounts three fixed rows and keeps nodes on cue changes', () => {
  const {view, container, scroller} = fixture();
  view.render(0, {expanded: false});
  assert.deepEqual(container.children.map(x => x.textContent), ['\u00a0', 'Welcome', 'Research at CMU']);
  const firstNodes = [...container.children];
  view.render(0, {expanded: false});
  view.render(1, {expanded: false});
  assert.equal(container.replaceCount, 1, 'time updates must not re-create DOM');
  assert.equal(container.children[0], firstNodes[0]);
  assert.deepEqual(container.children.map(x => x.textContent), ['Welcome', 'Research at CMU', 'Finish']);
  assert.equal(scroller.scrollTop, 0);
});

test('expanded mode only changes current classes; auto-follow scrolls the transcript, not document', () => {
  const {view, container, scroller} = fixture();
  scroller.clientHeight = 80; // Expanded transcript is taller than its viewport.
  view.render(0, {expanded: true});
  assert.equal(container.replaceCount, 1);
  assert.equal(container.children[0].classList.contains('current'), true);
  view.render(2, {expanded: true});
  assert.equal(container.children[2].classList.contains('current'), true);
  assert.equal(container.children[0].classList.contains('current'), false);
  assert.equal(container.replaceCount, 1);
  assert.notEqual(scroller.scrollTop, 0, 'only internal scrollTop should move');
});

test('manual transcript scrolling suppresses follow while cue highlighting continues', () => {
  const {view, container, scroller} = fixture();
  view.render(0, {expanded: true});
  scroller.scrollTop = 55;
  view.render(2, {expanded: true, follow: false});
  assert.equal(scroller.scrollTop, 55);
  assert.equal(container.children[2].classList.contains('current'), true);
  view.render(2, {expanded: true, follow: true, forceScroll: true});
  assert.notEqual(scroller.scrollTop, 55);
});

test('clicking a transcript line seeks without rebuilding active cue DOM', () => {
  const {view, container, clicked} = fixture();
  view.render(0, {expanded: true});
  const button = container.children[1];
  button.click();
  assert.deepEqual(clicked, [[1, 5]]);
  view.render(1, {expanded: true});
  assert.equal(container.children[1], button);
  assert.equal(container.replaceCount, 1);
});

test('empty transcript placeholder is mounted once', () => {
  const {view, container} = fixture([]);
  view.render(0);
  view.render(0);
  assert.equal(container.replaceCount, 1);
  assert.equal(container.children[0].textContent, 'Unavailable');
});

test('renderer stability patch applies once, preserves existing carousel code, compiles', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mcmu-lyric-stability-'));
  try {
    fs.mkdirSync(path.join(tmp, 'public/src'), {recursive: true});
    fs.mkdirSync(path.join(tmp, 'scripts'), {recursive: true});
    fs.writeFileSync(path.join(tmp, 'package.json'), '{"type":"module"}');
    const fixtureRenderer = `import { clearViewCleanup, state } from "./state.js";
import { canReuseStoryCarousel, updatePreservingStoryCarousel } from "./story-carousel.js";
function bindMainInteractions(root, view, lang) {
  const lyrics = root.querySelector("#lyrics");
  const lyricsScroll = root.querySelector("#lyricsScroll");
  const lyricsPlayer = root.querySelector("#lyricsPlayer");
  const ui = {noTranscriptLabel: 'No transcript'};
  const transcript = [];
  const audio = {currentTime: 0, play: () => Promise.resolve()};
  let currentLine = 0;
  let userIsScrolling = false;
  let scrollTimeout = null;
  function renderLyrics(forceUpdate = false) {
    const currentButton = lyrics.querySelector('button');
    if (currentButton) currentButton.scrollIntoView({ block: "center", inline: "nearest", behavior: "auto" });
  }

  function syncLyricsToTime() { renderLyrics(); }
  lyricsScroll?.addEventListener("scroll", () => {
    if (!lyricsPlayer.classList.contains("enlarged")) return;
    userIsScrolling = true;
    if (scrollTimeout) window.clearTimeout(scrollTimeout);
    scrollTimeout = window.setTimeout(() => {
      userIsScrolling = false;
      renderLyrics(true);
    }, 1800);
  });
  console.log(updatePreservingStoryCarousel, canReuseStoryCarousel);
}`;
    fs.writeFileSync(path.join(tmp, 'public/src/render.js'), fixtureRenderer);
    fs.copyFileSync(path.join(projectRoot, 'scripts/patch-transcript-stability.mjs'), path.join(tmp, 'scripts/patch-transcript-stability.mjs'));
    const apply = () => execFileSync(process.execPath, ['scripts/patch-transcript-stability.mjs'], {cwd: tmp, encoding: 'utf8'});
    assert.match(apply(), /Updated public\/src\/render.js/);
    const updated = fs.readFileSync(path.join(tmp, 'public/src/render.js'), 'utf8');
    assert.match(updated, /createTranscriptView/);
    assert.match(updated, /updatePreservingStoryCarousel/);
    assert.doesNotMatch(updated, /scrollIntoView/);
    assert.match(updated, /pauseTranscriptAutoFollow/);
    assert.match(apply(), /already applied/);
    assert.equal(updated, fs.readFileSync(path.join(tmp, 'public/src/render.js'), 'utf8'));
    execFileSync(process.execPath, ['--check', 'public/src/render.js'], {cwd: tmp});
  } finally { fs.rmSync(tmp, {recursive: true, force: true}); }
});

test('UI stability stylesheet fixes mobile page alignment and transcript anchoring', () => {
  const css = fs.readFileSync(path.join(projectRoot, 'public/ui-fixes.css'), 'utf8');
  assert.match(css, /overflow-anchor:\s*none/);
  assert.match(css, /\.lyrics-player:not\(\.enlarged\) #lyrics/);
  assert.match(css, /\.detail-page-shell\s*\{\s*align-items:\s*flex-start/);
});

test('the checked-out renderer includes transcript fix, when present', (t) => {
  const render = path.join(projectRoot, 'public/src/render.js');
  if (!fs.existsSync(render)) return t.skip('apply the patch to the full local repository');
  const source = fs.readFileSync(render, 'utf8');
  assert.match(source, /createTranscriptView/);
  assert.doesNotMatch(source, /scrollIntoView/);
  execFileSync(process.execPath, ['--check', render]);
});
