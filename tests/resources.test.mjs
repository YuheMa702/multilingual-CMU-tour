import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, access} from 'node:fs/promises';
import {validateResources, resourceText, isOfficialResourceUrl, renderResourcesContent, RESOURCES_ROUTE} from '../public/src/resources.js';

const publicDir = new URL('../public/', import.meta.url);
const data = JSON.parse(await readFile(new URL('content/metadata/resources.json', publicDir), 'utf8'));
const clone = () => structuredClone(data);

test('resources metadata is valid, the supplied hero exists, and all current labels are translated', async () => {
  validateResources(data);
  await access(new URL(data.hero.src, publicDir));
  const labels = [data.title, data.menuLabel, data.featuredHeading, data.categoriesHeading,
    data.newTabLabel, data.hero.alt, ...data.featured.map(x => x.label),
    ...data.categories.flatMap(x => [x.label, ...x.links.map(link => link.label)])];
  for (const label of labels) {
    assert.ok(label.en.trim());
    assert.ok(label.zh.trim());
  }
  assert.ok(data.categories.flatMap(x => x.links).every(link => isOfficialResourceUrl(link.url)));
});

test('featured questions reference existing links instead of duplicating URLs', () => {
  const links = new Map(data.categories.flatMap(x => x.links).map(x => [x.id, x.url]));
  for (const featured of data.featured) assert.ok(links.has(featured.linkId));
  assert.equal(links.get('cost-aid'), 'https://www.cmu.edu/admission/costs-aid');
  assert.equal(links.get('majors-programs'), 'https://www.cmu.edu/admission/majors-programs');
  assert.equal(links.get('housing'), 'https://www.cmu.edu/housing/');
});

test('resources render English and Chinese with native accordions and safe external links, without an audio player', () => {
  for (const lang of ['en', 'zh']) {
    const html = renderResourcesContent(data, lang);
    assert.ok(html.includes(data.title[lang]));
    assert.ok(html.includes(data.featuredHeading[lang]));
    assert.ok(html.includes(data.hero.alt[lang]));
    assert.equal((html.match(/<details\b/g) || []).length, data.categories.length);
    assert.equal((html.match(/target="_blank" rel="noopener noreferrer"/g) || []).length,
      data.categories.flatMap(x => x.links).length + data.featured.length);
    assert.doesNotMatch(html, /<audio\b|id="progressBar"|id="storiesList"/);
    assert.doesNotMatch(html, /<details[^>]+\sopen(?:\s|>)/);
  }
  const expanded = renderResourcesContent(data, 'zh', ['admissions']);
  assert.match(expanded, /data-resource-category="admissions" open/);
});

test('new languages use English per-label fallback and accept supplied translations without JS changes', () => {
  const next = clone();
  next.title.ko = '자료 및 다음 단계';
  validateResources(next);
  assert.equal(resourceText(next.title, 'ko'), '자료 및 다음 단계');
  assert.equal(resourceText(next.featuredHeading, 'ko'), data.featuredHeading.en);
  const html = renderResourcesContent(next, 'ko');
  assert.ok(html.includes(next.title.ko));
  assert.ok(html.includes(next.featuredHeading.en));
});

test('malformed metadata, dangerous URLs and duplicate IDs fail validation', () => {
  for (const url of ['javascript:alert(1)', 'http://www.cmu.edu/', 'https://cmu.edu.evil.test/', 'https://cmu.edu@evil.test/', 'https://example.com/']) {
    const next = clone();
    next.categories[0].links[0].url = url;
    assert.throws(() => validateResources(next), /official HTTPS CMU URL/);
  }
  const badFeatured = clone(); badFeatured.featured[0].linkId = 'no-such-link';
  assert.throws(() => validateResources(badFeatured), /featured link ID/);
  const duplicate = clone(); duplicate.categories[1].links[0].id = duplicate.categories[0].links[0].id;
  assert.throws(() => validateResources(duplicate), /duplicate link ID/);
  const badHero = clone(); badHero.hero.src = '../secret.jpg';
  assert.throws(() => validateResources(badHero), /hero image path/);
  const badLabel = clone(); badLabel.title.en = '';
  assert.throws(() => validateResources(badLabel), /English label/);
});

test('editorial labels are HTML-escaped', () => {
  const next = clone(); next.title.en = '<script>alert(1)</script>';
  const html = renderResourcesContent(validateResources(next), 'en');
  assert.ok(html.includes('&lt;script&gt;'));
  assert.doesNotMatch(html, /<script>/);
});

test('installed app connects the resources route, shared menu, stylesheet, and manifest loader', async () => {
  const [router, renderer, manifest, index] = await Promise.all([
    'src/router.js', 'src/render.js', 'src/content-manifest.js', 'index.html'
  ].map(file => readFile(new URL(file, publicDir), 'utf8')));
  assert.equal(RESOURCES_ROUTE, '#/resources');
  assert.match(router, /route === 'resources'/);
  assert.match(renderer, /if \(route === "resources"\) return renderResources\(root\)/);
  assert.match(renderer, /bindMenuInteractions\(root, \{viewKind: 'resources'\}\)/);
  assert.match(renderer, /bindMenuInteractions\(root, view\)/);
  assert.match(renderer, /resourceText\(RESOURCES\.menuLabel, lang\)/);
  assert.match(renderer, /nextIndex === stopList\.length && delta > 0/);
  assert.match(manifest, /RESOURCES = await loadResources\(\)/);
  assert.match(index, /href="\.\/resources\.css"/);
});
