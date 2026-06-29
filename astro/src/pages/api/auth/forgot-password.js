import { json, handler, readBody } from '../../../lib/http.js';
import { email, oneOf } from '../../../lib/validate.js';
import { createPasswordReset } from '../../../lib/password-reset.js';

export const POST = handler(async ({ request }) => {
  const b = await readBody(request);
  const mail = email(b.email);
  const role = b.role === undefined || b.role === null || b.role === ''
    ? 'participant'
    : oneOf(b.role, ['participant', 'admin'], 'perfil');

  return json(await createPasswordReset({ request, email: mail, role }));
});
