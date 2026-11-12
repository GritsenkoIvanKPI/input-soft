// Content storage in a GitHub repository (used when GITHUB_TOKEN is set). Runs on any host with fetch.
import { base64ToText, fail, FORMS_PATH } from './core.js';

export function githubStore({ token, repo, branch = 'main' }) {
  const gh = async (path, opts = {}) => {
    const res = await fetch(`https://api.github.com/repos/${repo}${path}`, {
      ...opts,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'inputsoft-admin',
        ...(opts.body ? { 'Content-Type': 'application/json' } : {}),
      },
    });
    if (!res.ok) throw fail(502, `GitHub ${res.status}: ${(await res.text()).slice(0, 300)}`);
    return res.json();
  };

  return {
    async head() {
      return (await gh(`/git/ref/heads/${branch}`)).object.sha;
    },
    async snapshot(sha) {
      const commit = await gh(`/git/commits/${sha}`);
      const tree = await gh(`/git/trees/${commit.tree.sha}?recursive=1`);
      const entries = tree.tree.filter((e) => e.type === 'blob');
      const json = entries.filter((e) => e.path === 'content/site.json' || e.path === FORMS_PATH || /^content\/pages\/[^/]+\.json$/.test(e.path));
      const blobs = await Promise.all(json.map((e) => gh(`/git/blobs/${e.sha}`)));
      const files = Object.fromEntries(json.map((e, i) => [e.path, base64ToText(blobs[i].content)]));
      const images = entries.map((e) => e.path).filter((p) => /^assets\/img\/.+\.(jpg|jpeg|png|webp|svg)$/i.test(p));
      return { files, images };
    },
    async changedSince(base, head) {
      const cmp = await gh(`/compare/${base}...${head}`);
      return (cmp.files || []).map((f) => f.filename);
    },
    async commit({ head, writes, deletes, message }) {
      const commit = await gh(`/git/commits/${head}`);
      const blobs = await Promise.all(writes.map((w) => (w.encoding === 'base64'
        ? gh('/git/blobs', { method: 'POST', body: JSON.stringify({ content: w.content, encoding: 'base64' }) }).then((b) => ({ path: w.path, mode: '100644', type: 'blob', sha: b.sha }))
        : Promise.resolve({ path: w.path, mode: '100644', type: 'blob', content: w.content }))));
      const tree = await gh('/git/trees', {
        method: 'POST',
        body: JSON.stringify({ base_tree: commit.tree.sha, tree: [...blobs, ...deletes.map((path) => ({ path, mode: '100644', type: 'blob', sha: null }))] }),
      });
      const next = await gh('/git/commits', { method: 'POST', body: JSON.stringify({ message, tree: tree.sha, parents: [head] }) });
      await gh(`/git/refs/heads/${branch}`, { method: 'PATCH', body: JSON.stringify({ sha: next.sha }) });
      return next.sha;
    },
  };
}
