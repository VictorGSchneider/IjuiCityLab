import { json } from '../../lib/http.js';
export const GET = () => json({ ok: true, ts: Date.now() });
