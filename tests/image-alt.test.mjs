import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, access} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('normalized photo descriptions refer to existing photos and contain English/Chinese alt text', async () => {
  const file = path.join(projectRoot, 'public/content/metadata/image-alt.json');
  const data = JSON.parse(await readFile(file, 'utf8'));
  assert.equal(data.schemaVersion, 1);
  assert.ok(data.images && typeof data.images === 'object');
  assert.ok(Object.keys(data.images).length > 0);
  for (const [filename, translations] of Object.entries(data.images)) {
    assert.match(filename, /^(?:stop|story)--[a-z0-9-]+--(?:\d{3}|(?:en|zh)--\d{3})\.(?:jpg|jpeg|png|webp)$/);
    assert.ok(translations.en?.trim(), `missing English alt: ${filename}`);
    assert.ok(translations.zh?.trim(), `missing Chinese alt: ${filename}`);
    await access(path.join(projectRoot, 'public/content/images', filename));
  }
});
