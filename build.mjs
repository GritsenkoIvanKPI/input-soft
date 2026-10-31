// Builds every page of the site from content/*.json with lib/render.js.
// Usage: node build.mjs [output-dir]
// The admin panel (/admin) renders with the same code, so local builds and published pages match.
import { readFile, readdir, writeFile, mkdir } from 'node:fs/promises';
import { manifest } from './api/_lib.js';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { renderSite } from './lib/render.js';

export async function loadContent(root = '.') {
  const site = JSON.parse(await readFile(join(root, 'content/site.json'), 'utf8'));
  const dir = join(root, 'content/pages');
  const files = (await readdir(dir)).filter((f) => f.endsWith('.json')).sort();
  const pages = await Promise.all(files.map(async (f) => JSON.parse(await readFile(join(dir, f), 'utf8'))));
  return { site, pages };
}

if (import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const out = process.argv[2] || '.';
  await mkdir(out, { recursive: true });
  const { site, pages } = await loadContent();
  for (const { file, html } of renderSite(site, pages)) {
    await writeFile(join(out, file), html);
    console.log('built', file);
  }
  // content/manifest.json: page and image list the admin reads when GitHub is not connected
  const images = [];
  const walk = async (dir) => {
    for (const e of await readdir(dir, { withFileTypes: true })) {
      const p = `${dir}/${e.name}`;
      if (e.isDirectory()) await walk(p);
      else if (/\.(jpg|jpeg|png|webp|svg)$/i.test(e.name)) images.push(p);
    }
  };
  await walk('assets/img');
  await writeFile('content/manifest.json', manifest(pages, images));
  console.log('built content/manifest.json');
}
