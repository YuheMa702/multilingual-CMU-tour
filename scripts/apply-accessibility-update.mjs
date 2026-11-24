/** Install the accessibility update without replacing the current renderer or Resources integration. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const changes = new Map();
const read = file => fs.readFile(path.join(root,file),'utf8');
const json = value => JSON.stringify(value,null,2)+'\n';
function replace(source, before, after, label) {
  if (source.includes(after)) return source;
  const start=source.indexOf(before);
  if(start<0 || source.indexOf(before,start+before.length)>=0) throw new Error(`${label}: source anchor missing or ambiguous; nothing was changed.`);
  return source.slice(0,start)+after+source.slice(start+before.length);
}
async function edit(file, transform) {
  const original=await read(file), updated=transform(original.replace(/\r\n/g,'\n'));
  if(original!==updated) changes.set(file,{original,updated});
}
const strings={
  en:{previousImageAria:'Previous image',nextImageAria:'Next image',audioProgressAria:'Audio playback position',collapseTranscriptAria:'Collapse transcript',transcriptAria:'Audio transcript'},
  zh:{previousImageAria:'上一张图片',nextImageAria:'下一张图片',audioProgressAria:'音频播放进度',collapseTranscriptAria:'收起字幕',transcriptAria:'音频字幕'},
  es:{previousImageAria:'Imagen anterior',nextImageAria:'Imagen siguiente',audioProgressAria:'Posición de reproducción del audio',collapseTranscriptAria:'Contraer transcripción',transcriptAria:'Transcripción del audio'}
};
async function main(){
  const ref=JSON.parse(await read('scripts/accessibility-photo-reference.json')).images;
  const marker='// ACCESSIBILITY UPDATE: keyboard player';
  const alreadyInstalled=(await read('public/src/render.js')).includes(marker);
  const files=(await fs.readdir(path.join(root,'public/content/images'))).filter(n=>/\.(jpe?g|png|webp)$/i.test(n)&&!n.startsWith('_unassigned-'));
  const cfg=JSON.parse(await read('public/content/metadata/ui.json'));
  const enabled=Object.entries(cfg.languages).filter(([,v])=>v.enabled!==false).map(([k])=>k);
  await edit('public/content/metadata/image-alt.json',source=>{
    const old=JSON.parse(source), images={};
    for(const name of files.sort()){
      const story=name.match(/^story--.+--([a-z]{2,3})(?:--\d{3})?\.(?:jpg|jpeg|png|webp)$/);
      const languages=story?[story[1]]:enabled;
      const previous=old.images?.[name]||{}, reference=ref[name]||{};
      const result={};
      for(const lang of languages){
        // Preserve local editorial work on newly added photos and languages.
        const value=alreadyInstalled ? (previous[lang] || reference[lang]) : (reference[lang] || previous[lang]);
        if(typeof value!=='string'||!value.trim()) throw new Error(`Missing ${lang} description for ${name}. Add it to image-alt.json and retry.`);
        result[lang]=value.trim();
      }
      // Keep existing additional stop translations for currently disabled languages.
      if(!story) for(const [lang,value] of Object.entries(previous)) if(!(lang in result)&&typeof value==='string'&&value.trim()) result[lang]=value.trim();
      images[name]=result;
    }
    return json({...old,schemaVersion:1,images});
  });
  await edit('public/content/metadata/ui.json',source=>{
    const data=JSON.parse(source);
    for(const [lang,labels] of Object.entries(strings)) if(data.ui[lang]) for(const [key,value] of Object.entries(labels)) data.ui[lang][key] ??=value;
    return json(data);
  });
  await edit('public/index.html',s=>{
    if(!s.includes('./accessibility.css')) s=replace(s,'</head>','  <link rel="stylesheet" href="./accessibility.css" />\n  </head>','stylesheet');
    return s;
  });
  await edit('public/src/main.js',s=>{
    if(s.includes('installAccessibility();')) return s;
    s="import {installAccessibility} from './accessibility.js';\n"+s;
    return replace(s,'    await render();','    await render();\n    installAccessibility();','boot accessibility');
  });
  await edit('public/src/render.js',s=>{
    if(s.includes(marker))return s;
    s=replace(s,`  playIcon.addEventListener("click", () => {
    audio.play().catch(() => {});
  });

  pauseIcon.addEventListener("click", () => {
    audio.pause();
  });`,`${marker}
  const playPauseBtn = root.querySelector("#playPauseBtn");
  playIcon.alt = "";
  pauseIcon.alt = "";
  playPauseBtn.addEventListener("click", () => {
    if (audio.paused) audio.play().catch(() => {});
    else audio.pause();
  });`,'native play/pause button');
    s=replace(s,'    pauseIcon.style.display = isPaused ? "none" : "inline";','    pauseIcon.style.display = isPaused ? "none" : "inline";\n    root.querySelector("#playPauseBtn").setAttribute("aria-label", isPaused ? ui.playAlt : ui.pauseAlt);','play/pause name');
    return s;
  });
  for(const [file,{updated}] of changes) if(file.endsWith('.js')){
    const checked=spawnSync(process.execPath,['--input-type=module','--check'],{input:updated,encoding:'utf8'});
    if(checked.status!==0)throw new Error(`${file}: ${checked.stderr}`);
  }
  console.log(`${files.length} photographs validated; ${files.filter(n=>n.startsWith('stop--')).length} stop, ${files.filter(n=>n.startsWith('story--')).length} story.`);
  if(process.argv.includes('--dry-run')){console.log('Dry run: would update', [...changes.keys()].join(', ')||'(none)');return;}
  const written=[];
  try{for(const [file,{updated}] of changes){await fs.writeFile(path.join(root,file),updated,'utf8');written.push(file);}}
  catch(e){for(const file of written.reverse())await fs.writeFile(path.join(root,file),changes.get(file).original,'utf8');throw e;}
  console.log('Accessibility update applied:',[...changes.keys()].join(', ')||'already installed');
  console.log('Run npm run check before publishing.');
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
