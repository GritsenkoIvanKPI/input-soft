// POST /api/publish { base, message, changes } -> commits the changes and every re-rendered page
import { requireAuth, readBody, publish, send, handle, isLocal } from './_lib.js';

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  await handle(res, async () => {
    if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });
    requireAuth(req);
    const body = await readBody(req);
    const result = await publish(body);
    return send(res, 200, { ...result, local: isLocal() });
  });
}
