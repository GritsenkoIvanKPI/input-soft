// POST /api/login { password } -> { token }
import { checkPassword, issueToken, readBody, send, handle, wait, isLocal } from './_lib.js';

export default async function handler(req, res) {
  await handle(res, async () => {
    if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });
    if (!process.env.ADMIN_PASSWORD) return send(res, 500, { error: 'The admin password is not set up on the server yet (ADMIN_PASSWORD).' });
    const { password } = await readBody(req);
    if (!checkPassword(password)) {
      await wait(900); // slow down guessing
      return send(res, 401, { error: 'Wrong password.' });
    }
    return send(res, 200, { token: issueToken(), local: isLocal() });
  });
}
