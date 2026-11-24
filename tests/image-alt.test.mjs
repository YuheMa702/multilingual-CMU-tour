import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, readdir, access} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../public/content');
const readJson=async file=>JSON.parse(await readFile(path.join(root,file),'utf8'));
const valid=value=>typeof value==='string'&&value.trim().length>0;

test('all installed content photos have appropriate localized alternative text',async()=>{
  const data=await readJson('metadata/image-alt.json');
  const config=await readJson('metadata/ui.json');
  assert.equal(data.schemaVersion,1);
  const languages=Object.entries(config.languages).filter(([,v])=>v.enabled!==false).map(([k])=>k);
  const filenames=(await readdir(path.join(root,'images'))).filter(n=>/\.(jpe?g|png|webp)$/i.test(n)&&!n.startsWith('_unassigned-')).sort();
  assert.ok(filenames.length);
  assert.deepEqual(Object.keys(data.images).sort(),filenames,'Image alt catalog must exactly cover installed content photos');
  for(const filename of filenames){
    const story=filename.match(/^story--.+--([a-z]{2,3})(?:--\d{3})?\.(?:jpg|jpeg|png|webp)$/);
    const translations=data.images[filename];
    if(story){
      assert.deepEqual(Object.keys(translations),[story[1]],`Story photo language: ${filename}`);
      assert.ok(valid(translations[story[1]]),`Missing ${story[1]} alt: ${filename}`);
    }else{
      assert.match(filename,/^stop--[a-z0-9-]+--\d{3}\.(jpg|jpeg|png|webp)$/);
      for(const lang of languages)assert.ok(valid(translations[lang]),`Missing ${lang} alt: ${filename}`);
    }
  }
});

test('Resources hero (if installed) has alt text in every enabled language',async t=>{
  let resource;
  try{resource=await readJson('metadata/resources.json');}catch(error){if(error.code==='ENOENT')return t.skip('Resources page not installed');throw error;}
  const config=await readJson('metadata/ui.json');
  for(const [lang,options] of Object.entries(config.languages)) if(options.enabled!==false) assert.ok(valid(resource.hero?.alt?.[lang]),`Resources hero missing ${lang} alt`);
  assert.match(resource.hero.src,/^\.\/content\/resources\/[a-z0-9-]+\.(jpg|jpeg|png|webp)$/);
  await access(path.join(root,resource.hero.src.replace(/^\.\/content\//,'')));
});
