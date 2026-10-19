import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const metadata = new URL('../public/content/metadata/', import.meta.url);

test('the default route uses the first stop shown in the menu', async () => {
  const manifest = JSON.parse(await readFile(new URL('generated.json', metadata), 'utf8'));
  assert.ok(manifest.stops.length > 0, 'no tour stops found');
  const expected = [...manifest.stops].sort((a, b) => a.order - b.order)[0].id;
  assert.equal(manifest.stops[0].id, expected, 'manifest stops are not in menu order');
  assert.equal(manifest.defaultStopId, expected, 'default stop must match first menu stop');
});
