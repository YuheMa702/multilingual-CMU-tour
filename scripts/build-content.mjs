/**
 * Content compiler: scans flat media folders and human-editable metadata files.
 * Only Node built-ins are used. Identical output on Express and GitHub Pages.
 * Run from anywhere: node scripts/build-content.mjs
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const content = path.join(root, 'public', 'content');
const metadata = path.join(content, 'metadata');
const STRICT = process.argv.includes('--strict');
const errors = [];
const warnings = [];
const fail = message => errors.push(message);
const warn = message => warnings.push(message);
const idPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const langPattern = /^[a-z]{2,3}$/;
const pathUrl = (folder, name) => `./content/${folder}/${encodeURIComponent(name)}`;

async function readTsv(name, fixedColumns) {
  const src = (await fs.readFile(path.join(metadata,name),'utf8')).replace(/^\uFEFF/,'').replace(/\r/g,'');
  const lines = src.split('\n').map(line => line.trimEnd()).filter(line => line.trim() && !line.startsWith('#'));
  if (!lines.length) throw new Error(`${name}: file is empty`);
  const headers = lines.shift().split('\t');
  for (const header of fixedColumns) if (!headers.includes(header)) fail(`${name}: missing column ${header}`);
  if (new Set(headers).size !== headers.length) fail(`${name}: duplicate columns`);
  const data = [];
  for (let n = 0; n < lines.length; n++) {
    const cols = lines[n].split('\t');
    if (cols.length !== headers.length) {fail(`${name} row ${n+2}: expected ${headers.length} columns, got ${cols.length}`);continue;}
    data.push(Object.fromEntries(headers.map((key,i)=>[key,cols[i].trim()])));
  }
  return {headers, data};
}

// One row per stop; all enabled-language display names live in stops.tsv.
function buildStops(rows, languages) {
  const usedIds = new Set();
  const usedOrders = new Set();
  return rows.map((row, i) => {
    const location = `stops.tsv row ${i + 2}`;
    if (!idPattern.test(row.id || '')) fail(`${location}: invalid stop id '${row.id}'`);
    if (usedIds.has(row.id)) fail(`${location}: duplicate id '${row.id}'`);
    usedIds.add(row.id);
    const order = Number(row.order);
    if (!Number.isSafeInteger(order) || order <= 0) fail(`${location}: order must be a positive integer`);
    if (usedOrders.has(order)) fail(`${location}: duplicate stop order ${order}`);
    usedOrders.add(order);
    const names = {};
    for (const lang of languages) {
      if (row[lang]) names[lang] = row[lang];
      else if (lang !== 'en') warn(`stop/${row.id}: no '${lang}' title, English fallback will be used`);
    }
    if (!names.en) fail(`${location}: English title is required`);
    return {id:row.id, order, names, audio:{}, transcripts:{}, images:[]};
  }).sort((a,b) => a.order-b.order || a.id.localeCompare(b.id));
}

// One TSV row per recording; each language occupies a single contiguous block.
// The order of rows *within each language block* is its display order.
// Story IDs can repeat across language blocks, but speaker names must agree.
function buildStories(rows, declaredLanguages) {
  const byId = new Map();
  const variants = new Set();
  const positions = new Map();
  const finishedLanguages = new Set();
  let activeLanguage = null;

  rows.forEach((row, i) => {
    const where = `stories.tsv row ${i + 2}`;
    const {id, speaker, language, title} = row;
    if (!idPattern.test(id || '')) fail(`${where}: invalid story id '${id}'`);
    if (!speaker) fail(`${where}: speaker is required`);
    if (!declaredLanguages.includes(language)) fail(`${where}: language '${language}' is not declared in ui.json`);
    if (!title) fail(`${where}: title is required`);

    if (language !== activeLanguage) {
      if (activeLanguage !== null) finishedLanguages.add(activeLanguage);
      if (finishedLanguages.has(language)) {
        fail(`${where}: '${language}' stories must be grouped together; move this row into the existing '${language}' block`);
      }
      activeLanguage = language;
    }

    const key = `${id}/${language}`;
    if (variants.has(key)) fail(`${where}: duplicate story/language variant ${key}`);
    variants.add(key);
    if (!byId.has(id)) {
      byId.set(id, {id, speaker, names:{}, audio:{}, transcripts:{}, images:{}, positionByLanguage:{}});
    }
    const story = byId.get(id);
    if (story.speaker !== speaker) fail(`${where}: story ${id} has an inconsistent speaker across languages`);
    story.names[language] = title;
    const position = (positions.get(language) || 0) + 1;
    positions.set(language, position);
    story.positionByLanguage[language] = position;
  });
  // Keep one global record per ID. Rendering sorts the relevant language's
  // subset by positionByLanguage[lang], not by this array's global order.
  return {stories:[...byId.values()], variants};
}

async function catalogDirectory(subdir, records, role, declaredLanguages, storyVariants) {
  const names = (await fs.readdir(path.join(content,subdir))).sort();
  const seen = new Set();
  const imagesByStop = new Map();
  for (const filename of names) {
    const abs = path.join(content,subdir,filename);
    if (!(await fs.stat(abs)).isFile()) {warn(`${subdir}: ignoring directory ${filename}`);continue;}
    if (filename.startsWith('_unassigned-') && role === 'image') {warn(`Unused original image: ${filename}`);continue;}
    if (filename.startsWith('.') || filename === '.gitkeep') continue;
    if (filename !== filename.toLowerCase()) fail(`${subdir}/${filename}: use lowercase filenames`);
    let match;
    if (role==='image') {
      match = filename.match(/^(stop)--([a-z0-9-]+)--(\d{3})\.(jpg|jpeg|png|webp)$/)
           || filename.match(/^(story)--([a-z0-9-]+)--([a-z]{2,3})\.(jpg|jpeg|png|webp)$/);
    } else {
      match = filename.match(/^(stop|story)--([a-z0-9-]+)--([a-z]{2,3})\.(mp3|wav|ogg|m4a|vtt)$/);
    }
    if (!match) {fail(`Unrecognized ${subdir} filename: ${filename}`);continue;}
    const [,entity,id,qualifier,ext] = match;
    if (!idPattern.test(id)) {fail(`Invalid id in ${filename}`);continue;}
    if (!records[entity].has(id)) {fail(`${subdir}/${filename}: ${entity} '${id}' not in metadata TSV`);continue;}
    const record = records[entity].get(id);
    if (entity==='story' && !storyVariants.has(`${id}/${qualifier}`)) {
      fail(`${subdir}/${filename}: story language '${qualifier}' is not registered in stories.tsv`);
      continue;
    }
    const url = pathUrl(subdir,filename);
    if (role==='image') {
      if (entity==='stop') {
        const key = `${id}:${qualifier}`;
        if (seen.has(key)) {fail(`Duplicate stop image number: ${key}`);continue;}
        seen.add(key);
        if (!imagesByStop.has(id)) imagesByStop.set(id,[]);
        imagesByStop.get(id).push({number:Number(qualifier),url});
      } else {
        if (!langPattern.test(qualifier) || !declaredLanguages.includes(qualifier)) {fail(`Unknown image language: ${filename}`);continue;}
        if (record.images[qualifier]) fail(`Multiple pictures for story/${id} language/${qualifier}`);
        record.images[qualifier] = url;
      }
    } else {
      if (!langPattern.test(qualifier) || !declaredLanguages.includes(qualifier)) {fail(`Unknown audio/transcript language: ${filename}`);continue;}
      if (role==='audio' && ext==='vtt') {fail(`Audio must be MP3/WAV/M4A/OGG: ${filename}`);continue;}
      if (role==='transcripts' && ext!=='vtt') {fail(`Transcript must be VTT: ${filename}`);continue;}
      const key = `${entity}/${id}/${qualifier}`;
      if (seen.has(key)) {fail(`${subdir}: duplicate variant ${key}`);continue;}
      seen.add(key);
      record[role][qualifier] = url;
    }
  }
  if (role==='image') {
    for (const [id,imgs] of imagesByStop) {
      imgs.sort((a,b)=>a.number-b.number);
      records.stop.get(id).images = imgs.map(x=>x.url);
      imgs.forEach((img,i)=> {if (img.number!==i+1) warn(`stop/${id}: photo numbering gap; expected ${String(i+1).padStart(3,'0')}`);});
    }
  }
}

async function main() {
  const uiConfig = JSON.parse(await fs.readFile(path.join(metadata,'ui.json'),'utf8'));
  const declaredLanguages = Object.keys(uiConfig.languages || {});
  // Disabled languages remain documented in ui.json, but are not exposed by the app.
  const languages = declaredLanguages.filter(lang => uiConfig.languages[lang]?.enabled !== false);
  if (!languages.includes('en')) fail('ui.json: English (en) must be enabled as the default language');
  if (uiConfig.defaultLanguage !== 'en') fail('ui.json: defaultLanguage must be en');
  for (const lang of declaredLanguages) {
    if (!langPattern.test(lang)) fail(`Invalid language code ${lang}`);
    if (!uiConfig.languages[lang].native) fail(`Language ${lang} is missing native name`);
  }
  if (!languages.length) throw new Error('ui.json: no languages');
  const [stopRows,storyRows] = await Promise.all([readTsv('stops.tsv',['id','order','en']),readTsv('stories.tsv',['id','speaker','language','title'])]);
  // Enforce one obvious format, rather than silently accepting stale 5-column TSVs.
  if (storyRows.headers.join('\t') !== 'id\tspeaker\tlanguage\ttitle') {
    fail('stories.tsv: columns must be exactly id, speaker, language, title (tab-separated; no order column)');
  }
  const stops = buildStops(stopRows.data,languages);
  const {stories,variants:storyVariants} = buildStories(storyRows.data,declaredLanguages);
  if (!stops.length) fail('No stops in stops.tsv');
  if (!stops.some(x => x.id === uiConfig.defaultStopId)) fail(`ui.json: defaultStopId '${uiConfig.defaultStopId}' does not match a stop`);
  const records = {stop:new Map(stops.map(x=>[x.id,x])),story:new Map(stories.map(x=>[x.id,x]))};
  await catalogDirectory('audio',records,'audio',declaredLanguages,storyVariants);
  await catalogDirectory('transcripts',records,'transcripts',declaredLanguages,storyVariants);
  await catalogDirectory('images',records,'image',declaredLanguages,storyVariants);
  // A registered story/language row is a promise that its recording exists.
  for (const variant of storyVariants) {
    const cut = variant.lastIndexOf('/');
    const id = variant.slice(0,cut);
    const lang = variant.slice(cut+1);
    if (!records.story.get(id)?.audio[lang]) fail(`stories.tsv: ${variant} is registered but its audio file is missing`);
  }
  for (const [entity,items] of [['stop',stops],['story',stories]]) {
    for (const item of items) {
      const audioLanguages = Object.keys(item.audio);
      if (!audioLanguages.length) fail(`${entity}/${item.id}: at least one narration recording is required`);
      for (const lang of Object.keys(item.transcripts)) if (!item.audio[lang]) warn(`${entity}/${item.id}: '${lang}' transcript has no matching '${lang}' audio`);
      for (const lang of audioLanguages) if (!item.transcripts[lang]) warn(`${entity}/${item.id}: missing '${lang}' transcript`);
      if (entity==='stop' && item.images.length===0) warn(`stop/${item.id}: no photos; placeholder image will display`);
      if (entity==='story') {
        for (const lang of audioLanguages) if (!item.images[lang]) warn(`story/${item.id}: no '${lang}' photo; placeholder will display`);
      }
    }
  }
  const baseUi = uiConfig.ui?.en || {};
  const ui = {};
  for (const lang of languages) {
    // Missing translations explicitly fall back to English; new keys require no JS changes.
    ui[lang] = {...baseUi,...(uiConfig.ui?.[lang] || {})};
    for (const key of Object.keys(baseUi)) if (lang !== 'en' && !Object.hasOwn(uiConfig.ui?.[lang] || {},key)) warn(`ui.json/${lang}: missing key '${key}', English fallback`);
  }
  if (errors.length || (STRICT && warnings.length)) {
    console.error(errors.map(x=>`ERROR: ${x}`).join('\n'));
    if (STRICT) console.error(warnings.map(x=>`WARNING: ${x}`).join('\n'));
    process.exitCode = 1;
    return;
  }
  const enabledLanguageDefinitions = Object.fromEntries(languages.map(lang => [lang,uiConfig.languages[lang]]));
  const result = {schemaVersion:1,defaultStopId:uiConfig.defaultStopId,languages:enabledLanguageDefinitions,ui,stops,stories};
  await fs.writeFile(path.join(metadata,'generated.json'),JSON.stringify(result,null,2)+'\n','utf8');
  const file = path.join(metadata,'validation-report.txt');
  await fs.writeFile(file, [
    `Tour stops: ${stops.length}`,
    `Student stories: ${stories.length}`,
    `Available audio versions: ${stops.concat(stories).reduce((n,x)=>n+Object.keys(x.audio).length,0)}`,
    `Warnings: ${warnings.length}`,'',...warnings.map(x=>`WARNING: ${x}`)
  ].join('\n')+'\n','utf8');
  console.log(`Generated ${stops.length} stops and ${stories.length} stories; warnings=${warnings.length}`);
  console.log(`Manifest: ${path.relative(root,path.join(metadata,'generated.json'))}`);
  if (warnings.length) console.log(`Warnings: ${path.relative(root,file)}`);
}

main().catch(e=>{console.error(e);process.exitCode=1;});
