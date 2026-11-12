// Local content storage for development (Node only): reads and writes the working copy.
import { readFile, readdir, writeFile, mkdir, unlink } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { FORMS_PATH } from './core.js';

export function localStore(root = process.cwd()) {
  return {
    async head() { return 'local'; },
    async snapshot() {
      const files = {};
      files['content/site.json'] = await readFile(join(root, 'content/site.json'), 'utf8');
      try { files[FORMS_PATH] = await readFile(join(root, FORMS_PATH), 'utf8'); } catch { /* not created yet */ }
      for (const f of await readdir(join(root, 'content/pages'))) {
        if (f.endsWith('.json')) files[`content/pages/${f}`] = await readFile(join(root, 'content/pages', f), 'utf8');
      }
      const images = [];
      const walk = async (dir) => {
        for (const e of await readdir(join(root, dir), { withFileTypes: true })) {
          const p = `${dir}/${e.name}`;
          if (e.isDirectory()) await walk(p);
          else if (/\.(jpg|jpeg|png|webp|svg)$/i.test(e.name)) images.push(p);
        }
      };
      await walk('assets/img');
      return { files, images };
    },
    async changedSince() { return []; },
    async commit({ writes, deletes }) {
      for (const w of writes) {
        await mkdir(dirname(join(root, w.path)), { recursive: true });
        await writeFile(join(root, w.path), w.encoding === 'base64' ? Buffer.from(w.content, 'base64') : w.content);
      }
      for (const d of deletes) await unlink(join(root, d)).catch(() => {});
      return 'local';
    },
  };
}

export async function readLocalForms(root = process.cwd()) {
  try { return JSON.parse(await readFile(join(root, FORMS_PATH), 'utf8')); } catch { return { recipients: [] }; }
}
