/**
 * One-time integration of the Resources page into the current main branch.
 * Run from any directory after extracting the ZIP over the repository root.
 * All required source anchors are checked before any existing file is changed.
 * Re-running the installer is a no-op. No media or metadata is overwritten by it.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const changes = new Map();
const marker = 'RESOURCES PAGE INTEGRATION';
function replaceOne(source, before, after, name) {
  const first = source.indexOf(before);
  if (first < 0 || source.indexOf(before, first + before.length) !== -1) {
    throw new Error(`${name}: expected exactly one matching source anchor. No integration changes written.`);
  }
  return source.slice(0, first) + after + source.slice(first + before.length);
}
function extract(source, start, end, name) {
  const first = source.indexOf(start);
  const last = first === -1 ? -1 : source.indexOf(end, first + start.length);
  if (first < 0 || last < 0 || source.indexOf(start, first + start.length) !== -1) throw new Error(`${name}: source boundaries not found or ambiguous`);
  return source.slice(first, last);
}
async function edit(file, transform) {
  const original = await fs.readFile(path.join(root, file), 'utf8');
  if (original.includes(marker)) return;
  const updated = transform(original.replace(/\r\n/g, '\n'));
  changes.set(file, {original, updated});
}

async function main() {
  for (const file of ['public/src/resources.js', 'public/resources.css', 'public/content/metadata/resources.json']) {
    await fs.access(path.join(root, file));
  }
  await edit('public/src/content-manifest.js', source => {
    let s = `// ${marker}\nimport {loadResources} from './resources.js';\n` + source;
    s = replaceOne(s, 'export let IMAGE_ALTS = {};', 'export let IMAGE_ALTS = {};\nexport let RESOURCES = null;', 'resource manifest export');
    s = replaceOne(s, '  initialized = true;', '  RESOURCES = await loadResources();\n  initialized = true;', 'load resources');
    return s;
  });
  await edit('public/src/router.js', source => {
    let s = `// ${marker}\nimport {RESOURCES_ROUTE} from './resources.js';\n` + source;
    s = replaceOne(s, "  if (route === 'main') {", `  if (route === 'resources') {
    if (location.hash !== RESOURCES_ROUTE) return redirect(RESOURCES_ROUTE);
    state.route = {name:'resources',stopId:null,storyId:'intro'}; return;
  }
  if (route === 'main') {`, 'resources route');
    return s;
  });
  await edit('public/index.html', source => replaceOne(source,
    '    <link rel="stylesheet" href="./ui-fixes.css" />',
    `    <link rel="stylesheet" href="./ui-fixes.css" />\n    <!-- ${marker} -->\n    <link rel="stylesheet" href="./resources.css" />`, 'resources stylesheet'));
  await edit('public/src/render.js', source => {
    let s = `// ${marker}\nimport {RESOURCES_ROUTE, resourceText, renderResourcesContent} from './resources.js';\nimport {RESOURCES} from './content-manifest.js';\n` + source;
    s = replaceOne(s, '  const route = state.route?.name || "lang";', '  const route = state.route?.name || "lang";\n  document.documentElement.lang = state.lang || DEFAULT_LANG;', 'document language');
    s = replaceOne(s, '  if (route === "main") return renderMain(root, token);', '  if (route === "main") return renderMain(root, token);\n  if (route === "resources") return renderResources(root);', 'resources renderer dispatch');

    // Reuse the existing CMU header and side menu instead of duplicating them.
    const header = extract(s, '          <header class="cmu-tour-header"', '\n\n          <div class="slideshow-container">', 'shared header');
    const menu = extract(s, '          <div id="sideMenu" class="side-menu">', '\n        </div>\n      </div>\n    </div>\n  `;', 'shared menu');
    s = replaceOne(s, header, '          ${buildHeaderMarkup(ui)}', 'extract header');
    s = replaceOne(s, menu, '          ${buildMenuMarkup(lang)}', 'extract menu');
    s = replaceOne(s, '  const languageOptions = getOrderedLanguageCodes(lang);\n', '', 'move language options');
    const updatedMenu = replaceOne(menu, '              </ul>', `                <li class="resource-menu-item">
                  <button class="resource-menu-button" id="resourcesMenuBtn" type="button" \${state.route?.name === 'resources' ? 'aria-current="page"' : ''}>
                    <span class="side-menu-num-circle">\${getStops().length + 1}</span>
                    <span class="side-menu-title">\${escapeHtml(resourceText(RESOURCES.menuLabel, lang))}</span>
                  </button>
                </li>
              </ul>`, 'resource menu item');

    const helpers = `function buildHeaderMarkup(ui) {
  return \`\n${header}\n  \`;
}

function buildMenuMarkup(lang) {
  const ui = getUiText(lang);
  const languageOptions = getOrderedLanguageCodes(lang);
  return \`\n${updatedMenu}\n  \`;
}

function renderResources(root) {
  const lang = state.lang || DEFAULT_LANG;
  const ui = getUiText(lang);
  // Preserve expanded categories when switching the UI language on this page.
  const openCategoryIds = [...root.querySelectorAll('.resource-category[open]')]
    .map(group => group.dataset.resourceCategory);
  root.innerHTML = \`
    <div class="app-page centered-page detail-page-shell">
      <div class="phone-shell detail-shell">
        <div class="content-container" data-view-kind="resources" data-language="\${escapeHtml(lang)}">
          \${buildHeaderMarkup(ui)}
          \${renderResourcesContent(RESOURCES, lang, openCategoryIds)}
          \${buildMenuMarkup(lang)}
        </div>
      </div>
    </div>
  \`;
  bindMenuInteractions(root, {viewKind: 'resources'});
}

`;
    const bindAnchor = 'function bindMainInteractions(root, view, lang, preservedStoryCarousel = false) {';
    s = replaceOne(s, bindAnchor, helpers + bindAnchor, 'shared markup helpers');

    // Pull the existing menu interaction code into one function used by both page types.
    const menuBindings = extract(s, '  const sideMenu = root.querySelector("#sideMenu");', '\n  registerCleanup(() => {\n    audio.pause();', 'shared menu interactions');
    const updatedBindings = replaceOne(menuBindings,
      '  root.querySelector("#openSettingsBtn")?.addEventListener("click", () => {',
      `  root.querySelector("#resourcesMenuBtn")?.addEventListener("click", () => {
    closeMenu();
    if (location.hash !== RESOURCES_ROUTE) location.hash = RESOURCES_ROUTE;
  });

  root.querySelector("#openSettingsBtn")?.addEventListener("click", () => {`, 'resource menu click');
    s = replaceOne(s, menuBindings, '  bindMenuInteractions(root, view);\n', 'use shared menu interactions');
    s = replaceOne(s, 'function getLanguageCodes() {', `function bindMenuInteractions(root, view) {\n${updatedBindings}\n}\n\nfunction getLanguageCodes() {`, 'shared menu function');

    // Resources is the last page of the tour, but does not enter the audio-stop catalog.
    s = replaceOne(s, '    if (nextIndex < 0 || nextIndex >= stopList.length) return;', `    if (nextIndex === stopList.length && delta > 0) {
      location.hash = RESOURCES_ROUTE;
      return;
    }
    if (nextIndex < 0 || nextIndex >= stopList.length) return;`, 'next from final stop');
    s = replaceOne(s, '    nextStopBtn.disabled = currentStopIndex >= stopList.length - 1;', '    nextStopBtn.disabled = currentStopIndex < 0;', 'enable final next button');
    return s;
  });
  // Syntax-check the transformed JavaScript before modifying existing files.
  for (const [file, {updated}] of changes) {
    if (!file.endsWith('.js')) continue;
    const check = spawnSync(process.execPath, ['--input-type=module', '--check'], {input: updated, encoding: 'utf8'});
    if (check.status !== 0) throw new Error(`Syntax check failed for ${file}: ${check.stderr}`);
  }
  if (process.argv.includes('--dry-run')) {
    console.log('Validated integration:', [...changes.keys()].join(', ') || 'already installed');
    return;
  }
  const written = [];
  try {
    for (const [file, {updated}] of changes) {
      await fs.writeFile(path.join(root, file), updated, 'utf8');
      written.push(file);
    }
  } catch (error) {
    for (const file of written.reverse()) await fs.writeFile(path.join(root, file), changes.get(file).original, 'utf8');
    throw error;
  }
  console.log(changes.size ? `Resources integration applied: ${[...changes.keys()].join(', ')}` : 'Resources integration already installed.');
  console.log('Run npm run check, then refresh the app.');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
