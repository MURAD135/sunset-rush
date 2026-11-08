import { readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
async function walk(dir) {
  const list = await readdir(dir, { withFileTypes: true });
  return (await Promise.all(list.map(e => e.isDirectory() ? walk(`${dir}/${e.name}`) : `${dir}/${e.name}`))).flat();
}
await writeFile('dist/THIRD_PARTY_NOTICES.txt', await readFile('docs/THIRD_PARTY_NOTICES.md'));
const files = (await walk('dist')).filter(p => !p.endsWith('/sw.js')).sort();
const hash = createHash('sha256');
for (const file of files) hash.update(await readFile(file));
const source = await readFile('public/sw.js', 'utf8');
await writeFile('dist/sw.js', source.replace('__BUILD_ID__', hash.digest('hex').slice(0,12)).replace('/*__ASSETS__*/ []', JSON.stringify(files.map(p => './' + p.slice(5)))));
