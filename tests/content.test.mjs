import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync, spawnSync} from 'node:child_process';
import os from 'node:os';
import {initializeContent, TOUR_STOPS, STORIES, DEFAULT_STOP_ID, getUiText, getLanguageCodes} from '../public/src/content-manifest.js';
import {loadTourView, isValidStory, parseWebVtt} from '../public/src/content-service.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const contentDir=path.join(root,'public');
const nativeFetch=globalThis.fetch;
globalThis.fetch=async (url) => {
  if (typeof url==='string' && url.startsWith('./')) {
    const file=path.resolve(contentDir,url.substring(2));
    try {return new Response(await fs.readFile(file),{status:200});}
    catch {return new Response('Not found',{status:404});}
  }
  return nativeFetch(url);
};
await initializeContent();
const manifest=JSON.parse(await fs.readFile(path.join(contentDir,'content/metadata/generated.json'),'utf8'));

test('all 15 stops and all 22 stories are populated from metadata and correctly ordered',()=>{
  assert.equal(TOUR_STOPS.length,15);
  assert.equal(STORIES.length,22);
  assert.deepEqual(TOUR_STOPS.map(s=>s.id),manifest.stops.map(s=>s.id));
  assert.deepEqual([...TOUR_STOPS].sort((a,b)=>a.order-b.order).map(x=>x.id),TOUR_STOPS.map(x=>x.id));
  assert.equal(DEFAULT_STOP_ID,manifest.defaultStopId);
});

test('all static paths in the manifest exist; each item has playable media',async()=>{
  for (const item of [...TOUR_STOPS,...STORIES]) {
    assert.ok(Object.values(item.audio).length,`no audio for ${item.id}`);
    const paths=[...Object.values(item.audio),...Object.values(item.transcripts),...(Array.isArray(item.images)?item.images:Object.values(item.images))];
    for (const p of paths) {
      assert.match(p,/^\.\/content\//);
      await fs.access(path.resolve(contentDir,decodeURIComponent(p.slice(2))));
    }
  }
});

test('each stop shows every story recorded in the selected language, but no intro card',async()=>{
  for (const lang of getLanguageCodes()) {
    const expected = STORIES.filter(story => story.audio?.[lang])
      .sort((a,b) => a.positionByLanguage[lang] - b.positionByLanguage[lang]);
    for (const stop of [TOUR_STOPS[0],TOUR_STOPS.at(-1)]) {
      const view = await loadTourView(stop.id,'intro',lang);
      assert.equal(view.viewKind,'intro');
      assert.deepEqual(view.relatedStories.map(s=>s.id),expected.map(s=>s.id));
      assert.ok(view.relatedStories.every(s=>s.id!=='intro'));
      assert.ok(view.relatedStories.every(s=>s.audioLang===lang));
      assert.equal(view.route,`#/main/${stop.id}`);
    }
  }
});

test('changing Chinese story positions does not change English story order',async()=>{
  const stop=TOUR_STOPS[0];
  const originalZh=await loadTourView(stop.id,'intro','zh');
  const englishBefore=(await loadTourView(stop.id,'intro','en')).relatedStories.map(x=>x.id);
  const first=STORIES.find(x=>x.id===originalZh.relatedStories[0].id);
  const second=STORIES.find(x=>x.id===originalZh.relatedStories[1].id);
  const oldFirst=first.positionByLanguage.zh;
  const oldSecond=second.positionByLanguage.zh;
  try {
    first.positionByLanguage.zh=oldSecond;
    second.positionByLanguage.zh=oldFirst;
    const chineseAfter=(await loadTourView(stop.id,'intro','zh')).relatedStories.map(x=>x.id);
    assert.equal(chineseAfter[0], second.id);
    assert.equal(chineseAfter[1], first.id);
    const englishAfter=(await loadTourView(stop.id,'intro','en')).relatedStories.map(x=>x.id);
    assert.deepEqual(englishAfter,englishBefore);
  } finally {
    first.positionByLanguage.zh=oldFirst;
    second.positionByLanguage.zh=oldSecond;
  }
});

test('Chinese story cards use Chinese titles, Chinese recordings and Chinese transcripts',async()=>{
  const stop=TOUR_STOPS.at(-1);
  const chineseStories=STORIES.filter(s=>s.audio?.zh);
  for (const story of chineseStories) {
    const view=await loadTourView(stop.id,story.id,'zh');
    assert.equal(view.viewKind,'story');
    assert.equal(view.storyId,story.id);
    assert.equal(view.viewTitle,story.names.zh);
    assert.equal(view.audioSrc,story.audio.zh);
    assert.equal(view.assetLang,'zh');
    assert.equal(view.stopId,stop.id);
  }
  assert.equal(chineseStories.length,13);
  assert.equal(STORIES.filter(s=>s.audio?.en).length,19);
  assert.equal(STORIES.filter(s=>s.audio?.es).length,0);
});

test('stories missing in a language are not selectable; intro remains available',async()=>{
  const stop=TOUR_STOPS[0];
  const englishOnly=STORIES.find(s=>s.audio?.en && !s.audio?.zh);
  assert.ok(englishOnly);
  assert.equal(isValidStory(englishOnly.id,'zh'),false);
  assert.equal(isValidStory(englishOnly.id,'en'),true);
  const view=await loadTourView(stop.id,englishOnly.id,'zh');
  assert.equal(view.viewKind,'intro');
  assert.equal(view.storyId,'intro');
  assert.equal(view.route,`#/main/${stop.id}`);
  assert.equal(isValidStory('intro','zh'),true);
});

test('missing stop pictures and story pictures use explicit placeholders',async()=>{
  const missing=TOUR_STOPS.find(x=>!x.images.length);
  const view=await loadTourView(missing.id,'intro','en');
  assert.match(view.slides[0],/stop-placeholder\.svg/);
  const story=STORIES.find(x=>!x.images.zh && x.audio?.zh);
  const storyView=await loadTourView(missing.id,story.id,'zh');
  assert.match(storyView.slides[0],/story-placeholder\.svg/);
});

test('demo only exposes English and Chinese; Spanish is disabled in editable UI metadata',async()=>{
  assert.deepEqual(getLanguageCodes(),['en','zh']);
  assert.deepEqual(Object.keys(manifest.languages), ['en','zh']);
  assert.equal(getUiText('zh').menuTitle,'菜单');
  assert.equal(getUiText('es').menuTitle, getUiText('en').menuTitle);
  const config=JSON.parse(await fs.readFile(path.join(contentDir,'content/metadata/ui.json'),'utf8'));
  assert.equal(config.languages.es.enabled,false);
  assert.equal(config.languages.en.enabled,true);
  assert.equal(config.languages.zh.enabled,true);
});

test('stories.tsv defines one language-specific title per recording',async()=>{
  const tsv=await fs.readFile(path.join(contentDir,'content/metadata/stories.tsv'),'utf8');
  const [header, ...lines]=tsv.trim().split(/\r?\n/);
  assert.equal(header, 'id\tspeaker\tlanguage\ttitle');
  assert.equal(lines.length,32);
  const variants=new Set();
  const seenLanguageBlocks=new Set();
  const perLanguagePositions=new Map();
  let activeLanguage=null;
  for (const line of lines) {
    const [id,speaker,language,title]=line.split('\t');
    assert.ok(id && speaker && title);
    assert.ok(['en','zh'].includes(language));
    if (language!==activeLanguage) {
      assert.ok(!seenLanguageBlocks.has(language), `noncontiguous ${language} block`);
      seenLanguageBlocks.add(language);
      activeLanguage=language;
    }
    assert.ok(!variants.has(`${id}/${language}`));
    variants.add(`${id}/${language}`);
    const position=(perLanguagePositions.get(language)||0)+1;
    perLanguagePositions.set(language,position);
    const story=STORIES.find(x=>x.id===id);
    assert.equal(story.names[language],title);
    assert.equal(story.positionByLanguage[language],position);
    assert.ok(story.audio[language]);
  }
  assert.deepEqual([...seenLanguageBlocks], ['en','zh']);
  assert.equal(perLanguagePositions.get('en'),19);
  assert.equal(perLanguagePositions.get('zh'),13);
  assert.equal(STORIES.find(x=>x.id==='julia-research-1').names.en,'Getting Involved in Research');
  assert.equal(STORIES.find(x=>x.id==='julia-research-1').names.zh,'参与研究');
  assert.equal(STORIES.find(x=>x.id==='ivy-ballet-3').names.zh,'芭蕾舞');
  assert.equal(STORIES.find(x=>x.id==='ivy-ballet-3').names.en,undefined);
});

async function storyFixture() {
  const scratch=await fs.mkdtemp(path.join(os.tmpdir(),'mcmu-story-metadata-'));
  await fs.mkdir(path.join(scratch,'scripts'),{recursive:true});
  const data=path.join(scratch,'public/content');
  for (const dir of ['metadata','audio','images','transcripts']) await fs.mkdir(path.join(data,dir),{recursive:true});
  await fs.copyFile(path.join(root,'scripts/build-content.mjs'),path.join(scratch,'scripts/build-content.mjs'));
  await fs.writeFile(path.join(scratch,'package.json'),'{"type":"module"}');
  await fs.writeFile(path.join(data,'metadata/stops.tsv'),'id\torder\ten\tzh\nalpha\t1\tAlpha\t阿尔法\n');
  await fs.writeFile(path.join(data,'metadata/ui.json'),JSON.stringify({
    defaultLanguage:'en',defaultStopId:'alpha',
    languages:{en:{native:'English',enabled:true},zh:{native:'中文',enabled:true},es:{native:'Español',enabled:false}},
    ui:{en:{menuTitle:'MENU'},zh:{menuTitle:'菜单'},es:{menuTitle:'MENÚ'}}
  }));
  await fs.writeFile(path.join(data,'audio/stop--alpha--en.mp3'),'stub');
  await fs.writeFile(path.join(data,'audio/story--julia-research-1--en.mp3'),'stub');
  await fs.writeFile(path.join(data,'audio/story--julia-research-1--zh.mp3'),'stub');
  const variants=[
    'id\tspeaker\tlanguage\ttitle',
    'julia-research-1\tJulia\ten\tGetting Involved in Research',
    'julia-research-1\tJulia\tzh\t参与研究'
  ];
  const source=path.join(data,'metadata/stories.tsv');
  await fs.writeFile(source,variants.join('\n')+'\n');
  const compile=()=>spawnSync(process.execPath,[path.join(scratch,'scripts/build-content.mjs')],{encoding:'utf8'});
  return {scratch,data,source,variants,compile};
}

test('generator accepts two titles under the same story ID and excludes disabled languages',async()=>{
  const f=await storyFixture();
  try {
    const run=f.compile();
    assert.equal(run.status,0,run.stderr);
    const output=JSON.parse(await fs.readFile(path.join(f.data,'metadata/generated.json'),'utf8'));
    assert.deepEqual(Object.keys(output.languages),['en','zh']);
    assert.equal(output.stories.length,1);
    assert.deepEqual(output.stories[0].names,{en:'Getting Involved in Research',zh:'参与研究'});
    assert.deepEqual(output.stories[0].positionByLanguage,{en:1,zh:1});
    assert.deepEqual(Object.keys(output.stories[0].audio).sort(),['en','zh']);
  } finally {await fs.rm(f.scratch,{recursive:true,force:true});}
});

test('generator rejects duplicate variant, mismatched speaker, scattered languages and unknown codes',async()=>{
  const invalid=[
    {name:'duplicate variant',rows:['julia-research-1\tJulia\tzh\tDuplicate'],regex:/duplicate story\/language variant/},
    {name:'wrong speaker',rows:['julia-research-1\tSomeone Else\tzh\tError'],regex:/inconsistent speaker/},
    {name:'unknown language',rows:['julia-research-1\tJulia\tfr\tError'],regex:/not declared in ui.json/},
    {name:'scattered languages',rows:['julia-research-1\tJulia\tzh\t参与研究','julia-research-1\tJulia\ten\tAgain'],regex:/must be grouped together/},
  ];
  for (const bad of invalid) {
    const f=await storyFixture();
    try {
      const lines=bad.name==='duplicate variant'
        ? [...f.variants,...bad.rows]
        : [...f.variants.slice(0,2),...bad.rows];
      await fs.writeFile(f.source,lines.join('\n')+'\n');
      const run=f.compile();
      assert.notEqual(run.status,0,`${bad.name} should fail`);
      assert.match(run.stderr,bad.regex,bad.name);
    } finally {await fs.rm(f.scratch,{recursive:true,force:true});}
  }
});

test('generator rejects legacy stories.tsv columns to prevent ambiguous ordering',async()=>{
  const f=await storyFixture();
  try {
    await fs.writeFile(f.source, 'id\tspeaker\torder\tlanguage\ttitle\n'+
      'julia-research-1\tJulia\t14\ten\tGetting Involved in Research\n'+
      'julia-research-1\tJulia\t14\tzh\t参与研究\n');
    const run=f.compile();
    assert.notEqual(run.status,0);
    assert.match(run.stderr,/columns must be exactly id, speaker, language, title/);
  } finally {await fs.rm(f.scratch,{recursive:true,force:true});}
});

test('generator records language-specific positions when English and Chinese story orders differ',async()=>{
  const f=await storyFixture();
  try {
    await fs.writeFile(path.join(f.data,'audio/story--sally-travel-1--en.mp3'),'stub');
    await fs.writeFile(path.join(f.data,'audio/story--sally-travel-1--zh.mp3'),'stub');
    await fs.writeFile(f.source,[
      'id\tspeaker\tlanguage\ttitle',
      'julia-research-1\tJulia\ten\tGetting Involved in Research',
      'sally-travel-1\tSally\ten\tTravelling',
      'sally-travel-1\tSally\tzh\t旅行',
      'julia-research-1\tJulia\tzh\t参与研究',
    ].join('\n')+'\n');
    const run=f.compile();
    assert.equal(run.status,0,run.stderr);
    const output=JSON.parse(await fs.readFile(path.join(f.data,'metadata/generated.json'),'utf8'));
    const julia=output.stories.find(x=>x.id==='julia-research-1');
    const sally=output.stories.find(x=>x.id==='sally-travel-1');
    assert.deepEqual(julia.positionByLanguage,{en:1,zh:2});
    assert.deepEqual(sally.positionByLanguage,{en:2,zh:1});
  } finally {await fs.rm(f.scratch,{recursive:true,force:true});}
});

test('generator rejects story metadata without audio and unregistered story audio variants',async()=>{
  const f=await storyFixture();
  try {
    await fs.rm(path.join(f.data,'audio/story--julia-research-1--zh.mp3'));
    let run=f.compile();
    assert.notEqual(run.status,0);
    assert.match(run.stderr,/registered but its audio file is missing/);
    await fs.writeFile(path.join(f.data,'audio/story--julia-research-1--zh.mp3'),'stub');
    await fs.writeFile(f.source,f.variants.slice(0,2).join('\n')+'\n');
    run=f.compile();
    assert.notEqual(run.status,0);
    assert.match(run.stderr,/not registered in stories.tsv/);
  } finally {await fs.rm(f.scratch,{recursive:true,force:true});}
});

test('WebVTT parser handles multiline cues, cue identifiers, BOM, HTML, and hour timestamps',()=>{
  const vtt='\uFEFFWEBVTT\r\n\r\nintro\r\n00:01.500 --> 00:04.000\r\nHello <b>CMU</b>\r\nvisitor\r\n\r\n01:03:04.200 --> 01:03:09.000\r\nLast line';
  const cues=parseWebVtt(vtt);
  assert.deepEqual(cues,[{time:1.5,text:'Hello CMU visitor'},{time:3784.2,text:'Last line'}]);
});

test('generator rejects unknown entity IDs without producing a misleading manifest',async()=>{
  const scratch=await fs.mkdtemp(path.join(os.tmpdir(),'mcmu-test-'));
  try {
    await fs.mkdir(path.join(scratch,'scripts'),{recursive:true});
    await fs.mkdir(path.join(scratch,'public/content/metadata'),{recursive:true});
    for (const dir of ['audio','images','transcripts']) await fs.mkdir(path.join(scratch,'public/content',dir));
    await fs.copyFile(path.join(root,'scripts/build-content.mjs'),path.join(scratch,'scripts/build-content.mjs'));
    await fs.writeFile(path.join(scratch,'package.json'),'{"type":"module"}');
    await fs.writeFile(path.join(scratch,'public/content/metadata/stops.tsv'),'id\torder\ten\nalpha\t1\tAlpha\n');
    await fs.writeFile(path.join(scratch,'public/content/metadata/stories.tsv'),'id\tspeaker\tlanguage\ttitle\n');
    await fs.writeFile(path.join(scratch,'public/content/metadata/ui.json'),JSON.stringify({defaultLanguage:'en',defaultStopId:'alpha',languages:{en:{native:'English'}},ui:{en:{menuTitle:'MENU'}}}));
    await fs.writeFile(path.join(scratch,'public/content/audio/stop--alpha--en.mp3'),'dummy');
    await fs.writeFile(path.join(scratch,'public/content/images/stop--missing--001.jpg'),'dummy');
    assert.throws(()=>execFileSync(process.execPath,[path.join(scratch,'scripts/build-content.mjs')],{stdio:'pipe'}));
    await assert.rejects(fs.access(path.join(scratch,'public/content/metadata/generated.json')));
  } finally {await fs.rm(scratch,{recursive:true,force:true});}
});

test('deployed renderer does not show the introduction as a story card (when integrated)',async(t)=>{
  const file=path.join(root,'public/src/render.js');
  try {
    const src=await fs.readFile(file,'utf8');
    assert.match(src,/const storyCards = view\.relatedStories;/);
    assert.doesNotMatch(src,/id:\s*["']intro["'],\s*title:\s*ui\.mainIntroductionTitle/);
    assert.match(src,/id=["']backToIntroBtn["']/);
  } catch(err) {if (err.code==='ENOENT') t.skip('Copy update over the original repo and run npm run patch-render to generate updated render.js');else throw err;}
});
