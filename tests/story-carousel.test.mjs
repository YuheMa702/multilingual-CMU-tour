import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {canReuseStoryCarousel, updatePreservingStoryCarousel} from '../public/src/story-carousel.js';

class FakeClassList {
  constructor(...tokens) { this.tokens = new Set(tokens); }
  contains(t) { return this.tokens.has(t); }
  toggle(t, force) {
    if (force === undefined ? !this.tokens.has(t) : force) this.tokens.add(t);
    else this.tokens.delete(t);
  }
}
class FakeElement {
  constructor(className, dataset = {}, children = []) {
    this.classList = new FakeClassList(className);
    this.dataset = {...dataset};
    this.children = children;
    children.forEach(child => child.parent = this);
    this.parent = null;
    this.scrollLeft = 0;
  }
  querySelector(selector) {
    if (selector === '.content-container' && this.classList.contains('content-container')) return this;
    if (selector === '.stories-rail' && this.classList.contains('stories-rail')) return this;
    for (const child of this.children) {
      const found = child.querySelector(selector);
      if (found) return found;
    }
    return null;
  }
  querySelectorAll(selector) {
    const matches = [];
    const matchesCard = selector === '.story-card-link[data-story-id]';
    if (matchesCard && this.classList.contains('story-card-link') && this.dataset.storyId) matches.push(this);
    for (const child of this.children) matches.push(...child.querySelectorAll(selector));
    return matches;
  }
  replaceWith(next) {
    if (!this.parent) throw new Error('No parent');
    const index = this.parent.children.indexOf(this);
    this.parent.children[index] = next;
    next.parent = this.parent;
    this.parent = null;
  }
}
const el = (klass, data, children) => new FakeElement(klass, data, children);
const storyCard = (id, route, selected = false) => {
  const card = el('story-card-link', {storyId: id, route});
  if (selected) card.classList.toggle('selected', true);
  return card;
};
function makeView(stopId, lang, current) {
  const rail = el('stories-rail', {}, [storyCard('alice', `#/main/${stopId}/story/alice`, current === 'alice'), storyCard('bob', `#/main/${stopId}/story/bob`, current === 'bob')]);
  const content = el('content-container', {viewKind: current === 'intro' ? 'intro' : 'story', stopId, language: lang}, [el('slideshow'), el('title'), el('musicPlayer'), el('stories-header-block'), rail, el('side-menu'), el('side-menu-overlay')]);
  return {rail, content, root: {
    querySelector: () => content
  }};
}
function updateWithFresh(fakeOld, fakeFresh, activeCardId, lang) {
  // The helper uses a template to parse the new markup. Stub only that
  // browser API, while preserving DOM-like node identity and replacement.
  globalThis.document = {
    createElement(tag) {
      assert.equal(tag, 'template');
      return { content: {querySelector: selector => selector === '.content-container' ? fakeFresh.content : null}, set innerHTML(_markup) {} };
    }
  };
  return updatePreservingStoryCarousel(fakeOld.root, '<main>new player</main>', {activeCardId}, lang);
}

test('same-language story selection keeps one rail, its scroll position, and its existing event handlers', () => {
  const old = makeView('wean', 'en', 'alice');
  const fresh = makeView('wean', 'en', 'bob');
  old.rail.scrollLeft = 317;
  const oldCards = old.rail.children;
  const oldScrollHandler = () => 'listener remains attached';
  old.rail.handler = oldScrollHandler;
  assert.equal(canReuseStoryCarousel(old.root, 'en'), true);
  assert.equal(updateWithFresh(old, fresh, 'bob', 'en'), true);
  assert.equal(old.content.children[4], old.rail);
  assert.equal(old.rail.scrollLeft, 317);
  assert.equal(old.rail.handler, oldScrollHandler);
  assert.equal(old.rail.children, oldCards);
  assert.equal(old.rail.children[0].classList.contains('selected'), false);
  assert.equal(old.rail.children[1].classList.contains('selected'), true);
  assert.equal(old.content.children[2], fresh.content.children[2]);
});

test('navigating to another stop updates story links but keeps scroll position', () => {
  const old = makeView('wean', 'en', 'alice');
  const fresh = makeView('gates', 'en', 'intro');
  old.rail.scrollLeft = 201;
  assert.equal(updateWithFresh(old, fresh, 'intro', 'en'), true);
  assert.equal(old.rail.scrollLeft, 201);
  assert.equal(old.rail.children[0].dataset.route, '#/main/gates/story/alice');
  assert.equal(old.content.dataset.stopId, 'gates');
  assert.ok(old.rail.children.every(card => !card.classList.contains('selected')));
});

test('a language change does not reuse another language\'s carousel', () => {
  const old = makeView('wean', 'en', 'alice');
  const fresh = makeView('wean', 'zh', 'alice');
  assert.equal(canReuseStoryCarousel(old.root, 'zh'), false);
  assert.equal(updateWithFresh(old, fresh, 'alice', 'zh'), false);
  assert.equal(old.content.children[4], old.rail);
});

test('changed story collection forces full render without mutating old page', () => {
  const old = makeView('wean', 'en', 'alice');
  const fresh = makeView('wean', 'en', 'bob');
  [fresh.rail.children[0], fresh.rail.children[1]] = [fresh.rail.children[1], fresh.rail.children[0]];
  const original = [...old.content.children];
  assert.equal(updateWithFresh(old, fresh, 'bob', 'en'), false);
  assert.deepEqual(old.content.children, original);
});

test('idempotent renderer patch adds content persistence hooks and compiles', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cmu-story-scroll-'));
  try {
    fs.mkdirSync(path.join(root, 'scripts'), {recursive: true});
    fs.mkdirSync(path.join(root, 'public/src'), {recursive: true});
    const fixture = `import { state } from "./state.js";
async function renderMain(root, token) {
  const lang = 'en';
  const ui = {loadingLabel: 'Loading'};
  const view = {stopId: 'wean'};
  root.innerHTML = \`\n    <div class="app-page centered-page detail-page-shell">\n      <div class="phone-shell detail-shell">\n        <div class="loading-state">\${escapeHtml(ui.loadingLabel)}</div>\n      </div>\n    </div>\n  \`;
  try {
    root.innerHTML = buildMainMarkup(view, lang);
    bindMainInteractions(root, view, lang);
  } catch (error) {}
}
function buildMainMarkup(view, lang) {
  return \`<div class="content-container" data-view-kind="\${escapeHtml(view.viewKind)}">
   <button class="story-card-link \${card.id === view.activeCardId ? "selected" : ""}" type="button" data-route="\${escapeHtml(card.route)}"></button></div>\`;
}
function bindMainInteractions(root, view, lang) {
  root.querySelectorAll("[data-route]").forEach((node) => {
    node.addEventListener("click", () => {
      const route = node.getAttribute("data-route");
      if (route) location.hash = route;
    });
  });
  root.querySelector("#storiesScrollLeftBtn")?.addEventListener("click", () => scrollStories(-1));
  root.querySelector("#storiesScrollRightBtn")?.addEventListener("click", () => scrollStories(1));
}
`;
    fs.writeFileSync(path.join(root, 'public/src/render.js'), fixture);
    const scriptPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../scripts/patch-story-carousel.mjs');
    fs.copyFileSync(scriptPath, path.join(root, 'scripts/patch-story-carousel.mjs'));
    fs.writeFileSync(path.join(root, 'package.json'), '{"type":"module"}');
    const execPatch = () => execFileSync(process.execPath, ['scripts/patch-story-carousel.mjs'], {cwd: root, encoding: 'utf8'});
    assert.match(execPatch(), /Patched/);
    const once = fs.readFileSync(path.join(root, 'public/src/render.js'), 'utf8');
    assert.match(once, /updatePreservingStoryCarousel/);
    assert.match(once, /data-story-id/);
    assert.match(once, /if \(!preservedStoryCarousel\)/);
    assert.match(execPatch(), /already installed/);
    assert.equal(fs.readFileSync(path.join(root, 'public/src/render.js'), 'utf8'), once);
    execFileSync(process.execPath, ['--check', 'public/src/render.js'], {cwd: root});
  } finally { fs.rmSync(root, {recursive: true, force: true}); }
});

// In a real checkout (rather than the isolated update bundle), verify that
// the one-time renderer patch has actually been applied.
test('repository renderer is wired to preserve the carousel', t => {
  const base = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const renderer = path.join(base, 'public/src/render.js');
  if (!fs.existsSync(renderer)) return t.skip('the isolated update bundle has no render.js');
  const source = fs.readFileSync(renderer, 'utf8');
  assert.match(source, /updatePreservingStoryCarousel\(root, markup, view, lang\)/);
  assert.match(source, /data-language=\"\$\{escapeHtml\(lang\)\}\"/);
  assert.match(source, /data-story-id=\"\$\{escapeHtml\(card\.id\)\}\"/);
  assert.match(source, /if \(!preservedStoryCarousel\)/);
  execFileSync(process.execPath, ['--check', renderer]);
});
