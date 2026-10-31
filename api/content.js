// GET /api/content -> the latest content of every page, the image library and the version it was read at
import { requireAuth, storage, parseSnapshot, send, handle, isLocal, isReadOnly } from './_lib.js';

export default async function handler(req, res) {
  await handle(res, async () => {
    if (req.method !== 'GET') return send(res, 405, { error: 'Method not allowed' });
    requireAuth(req);
    const store = storage(req);
    const head = await store.head();
    const snap = await store.snapshot(head);
    const { site, pages } = parseSnapshot(snap.files);
    return send(res, 200, { head, site, pages, images: snap.images.sort(), local: isLocal(), readOnly: isReadOnly() });
  });
}
