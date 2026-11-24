// Resources are a non-audio tour page. All editorial text and URLs live in
// content/metadata/resources.json; only the presentation and icons live here.
export const RESOURCES_ROUTE = '#/resources';

const ICONS = {
  cost: '<ellipse cx="15" cy="5" rx="6" ry="2.5"/><path d="M9 5v4m12-4v10c0 1.4-2.7 2.5-6 2.5M21 10c0 1.4-2.7 2.5-6 2.5"/><ellipse cx="8" cy="12" rx="6" ry="2.5"/><path d="M2 12v7c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5v-7M2 15.5c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5"/>',
  academics: '<path d="m2 9 10-5 10 5-10 5-10-5Zm4 2v6c3 3 9 3 12 0v-6m4-2v7"/>',
  housing: '<path d="m2 11 10-8 10 8M5 10v11h5v-7h4v7h5V10"/>',
  community: '<circle cx="9" cy="7" r="3"/><path d="M2 21v-3a7 7 0 0 1 14 0v3M16 4a3 3 0 0 1 0 6m2 3a6 6 0 0 1 4 5v3"/>',
  visiting: '<path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
  external: '<path d="M13 4h7v7m0-7-9 9m6 0v7H4V7h7"/>',
  chevron: '<path d="m6 9 6 6 6-6"/>'
};
const categoryIcons = new Set(['cost', 'academics', 'housing', 'community', 'visiting']);
const idPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const textKeys = ['title', 'menuLabel', 'featuredHeading', 'categoriesHeading', 'newTabLabel'];
const isText = value => typeof value === 'string' && Boolean(value.trim());

// Explicit, per-label English fallback permits new languages to be added
// incrementally, without cloning link lists or changing JS.
export function resourceText(translations, lang = 'en') {
  return isText(translations?.[lang]) ? translations[lang] : translations?.en || '';
}

export function isOfficialResourceUrl(value) {
  if (typeof value !== 'string' || !/^https:\/\//i.test(value)) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && !url.port &&
      (url.hostname === 'cmu.edu' || url.hostname.endsWith('.cmu.edu'));
  } catch { return false; }
}

export function validateResources(data) {
  const fail = message => { throw new Error(`resources.json: ${message}`); };
  const label = (value, field) => {
    if (!value || typeof value !== 'object' || Array.isArray(value) || !isText(value.en)) fail(`${field} needs an English label`);
    for (const [lang, text] of Object.entries(value)) {
      if (!/^[a-z]{2,3}$/.test(lang) || !isText(text)) fail(`${field}.${lang} must be non-empty text`);
    }
  };
  const icon = (value, field) => { if (!categoryIcons.has(value)) fail(`${field} has an unknown icon`); };
  if (data?.schemaVersion !== 1) fail('unsupported schema version');
  for (const key of textKeys) label(data[key], key);
  if (typeof data.hero?.src !== 'string' || !/^\.\/content\/resources\/[a-z0-9-]+\.(jpg|jpeg|png|webp)$/.test(data.hero.src)) fail('invalid hero image path');
  label(data.hero.alt, 'hero.alt');
  if (!Array.isArray(data.categories) || !data.categories.length || !Array.isArray(data.featured) || !data.featured.length) fail('featured and categories must be non-empty arrays');
  const categories = new Set(), links = new Set(), featured = new Set();
  for (const group of data.categories) {
    if (!idPattern.test(group?.id || '') || categories.has(group.id)) fail('invalid or duplicate category ID');
    categories.add(group.id);
    icon(group.icon, group.id); label(group.label, group.id);
    if (!Array.isArray(group.links) || !group.links.length) fail(`${group.id} has no links`);
    for (const link of group.links) {
      if (!idPattern.test(link?.id || '') || links.has(link.id)) fail('invalid or duplicate link ID');
      links.add(link.id); label(link.label, link.id);
      if (!isOfficialResourceUrl(link.url)) fail(`${link.id} must use an official HTTPS CMU URL`);
    }
  }
  for (const item of data.featured) {
    if (!links.has(item?.linkId) || featured.has(item.linkId)) fail('unknown or duplicate featured link ID');
    featured.add(item.linkId); icon(item.icon, item.linkId); label(item.label, item.linkId);
  }
  return data;
}

export async function loadResources() {
  const response = await fetch('./content/metadata/resources.json', {cache: 'no-cache'});
  if (!response.ok) throw new Error(`Cannot load resources (${response.status})`);
  return validateResources(await response.json());
}

function escapeHtml(value) {
  return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

function icon(name, extra = '') {
  return `<svg class="resource-icon ${extra}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${ICONS[name]}</svg>`;
}

export function renderResourcesContent(data, lang, openCategoryIds = []) {
  const local = value => escapeHtml(resourceText(value, lang));
  const links = new Map(data.categories.flatMap(group => group.links).map(link => [link.id, link]));
  function linkMarkup(link, label, leadingIcon = '') {
    // validateResources is called before render, and this check is defense in depth.
    if (!isOfficialResourceUrl(link.url)) throw new Error('Invalid resource link');
    return `<a class="resource-link${leadingIcon ? ' resource-featured-link' : ''}" href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer">
      ${leadingIcon ? icon(leadingIcon, 'resource-leading-icon') : ''}
      <span class="resource-link-label">${local(label)}<span class="resource-sr-only"> (${local(data.newTabLabel)})</span></span>
      ${icon('external', 'resource-external-icon')}
    </a>`;
  }
  return `<main class="resources-page" aria-labelledby="resources-title">
    <img class="resources-hero" src="${escapeHtml(data.hero.src)}" alt="${local(data.hero.alt)}" width="1200" height="800">
    <div class="resources-body">
      <h1 id="resources-title">${local(data.title)}</h1>
      <section class="resources-section" aria-labelledby="resources-featured-heading">
        <h2 id="resources-featured-heading">${local(data.featuredHeading)}</h2>
        <div class="resources-featured">${data.featured.map(item => linkMarkup(links.get(item.linkId), item.label, item.icon)).join('')}</div>
      </section>
      <section class="resources-section" aria-labelledby="resources-categories-heading">
        <h2 id="resources-categories-heading">${local(data.categoriesHeading)}</h2>
        <div class="resources-categories">${data.categories.map(group => `<details class="resource-category" data-resource-category="${escapeHtml(group.id)}"${openCategoryIds.includes(group.id) ? ' open' : ''}>
          <summary class="resource-category-summary">${icon(group.icon, 'resource-leading-icon')}<span class="resource-link-label">${local(group.label)}</span>${icon('chevron', 'resource-chevron')}</summary>
          <div class="resource-category-links">${group.links.map(link => linkMarkup(link, link.label)).join('')}</div>
        </details>`).join('')}</div>
      </section>
    </div>
  </main>`;
}
