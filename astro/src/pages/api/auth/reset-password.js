import { json, handler, readBody, httpError } from '../../../lib/http.js';
import { str } from '../../../lib/validate.js';
import { resetPassword } from '../../../lib/password-reset.js';

export const POST = handler(async ({ request }) => {
  const b = await readBody(request);
  const token = str(b.token, { label: 'codigo de recuperacao', min: 20, max: 300 });
  const password = str(b.password, { label: 'nova senha', min: 8, max: 128 });

  if (!await resetPassword({ token, password })) {
    throw httpError(400, 'Codigo invalido ou expirado');
  }
  return json({ ok: true });
});
