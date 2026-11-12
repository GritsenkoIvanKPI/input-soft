// Read-only content storage: reads the published content files from the website itself.
// Used when publishing is not set up yet (no GITHUB_TOKEN). get(path) returns a Response.
import { contentPath, fail, FORMS_PATH } from './core.js';

export function readonlyStore(get, setupHint) {
  const text = async (path, optional) => {
    const res = await get(path);
    if (!res.ok) {
      if (optional) return null;
      throw fail(502, `Could not read ${path} from the website (${res.status}).`);
    }
    return res.text();
  };
  return {
    async head() { return 'site'; },
    async snapshot() {
      const manifest = JSON.parse(await text('content/manifest.json'));
      const files = { 'content/site.json': await text('content/site.json') };
      const forms = await text(FORMS_PATH, true);
      if (forms) files[FORMS_PATH] = forms;
      await Promise.all(manifest.pages.map(async (f) => { files[contentPath(f)] = await text(contentPath(f)); }));
      return { files, images: manifest.images || [] };
    },
    async changedSince() { return []; },
    async commit() {
      throw fail(503, `Publishing is not switched on yet. ${setupHint}`);
    },
  };
}
