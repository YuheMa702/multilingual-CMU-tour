import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');
test('accessibility module and stylesheet are wired into the application',async()=>{
  assert.match(await read('public/src/main.js'),/installAccessibility\(\)/);
  assert.match(await read('public/index.html'),/href="\.\/accessibility\.css"/);
  const css=await read('public/accessibility.css');
  assert.match(css,/:focus-visible/);assert.match(css,/prefers-reduced-motion/);
});
test('audio play/pause is handled by the native button with changing accessible name',async()=>{
  const render=await read('public/src/render.js');
  assert.match(render,/playPauseBtn\.addEventListener\("click"/);
  assert.match(render,/isPaused \? ui\.playAlt : ui\.pauseAlt/);
  assert.doesNotMatch(render,/playIcon\.addEventListener\("click"/);
});
