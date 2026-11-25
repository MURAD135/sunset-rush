// Build a portable, offline desktop review copy from the tested production build.
import {build} from 'esbuild';
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import path from 'node:path';

const dist = path.resolve('dist');
let html = await readFile(path.join(dist, 'index.html'), 'utf8');
const entry = html.match(/<script type="module" crossorigin src="([^"]+)"><\/script>/)[1];
const css = html.match(/<link rel="stylesheet" crossorigin href="([^"]+)">/)[1];
const result = await build({entryPoints:[path.join(dist, entry)], bundle:true, format:'iife', minify:true, write:false});
const code = result.outputFiles[0].text;
const cssText = await readFile(path.join(dist, css), "utf8");
await mkdir("artifacts/review", {recursive:true});
html = html.replace(/<script type="module"[^>]+><\/script>/, '')
  .replace(/<link rel="(?:modulepreload|manifest|apple-touch-icon|icon)"[^>]*>/g, '')
  .replace(/<link rel="stylesheet"[^>]+>/, () => '<style>' + cssText + '</style>')
  .replace('</body>', () => '<script>' + code.replace(/<\/script/gi, '<\\/script') + '</script></body>');
await mkdir('review', {recursive:true});
await writeFile('artifacts/review/Sunset-Rush.html', html);
