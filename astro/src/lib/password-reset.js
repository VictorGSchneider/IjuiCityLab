import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { one, run } from './db.js';

const DEFAULT_MINUTES = 30;

function tokenHash(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function resetPageFor(role) {
  return role === 'admin' ? '/admin' : '/portal';
}

function resetMinutes() {
  const n = Number(process.env.PASSWORD_RESET_EXPIRES_MINUTES);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 24 * 60) : DEFAULT_MINUTES;
}

function shouldShowLink() {
  return process.env.PASSWORD_RESET_SHOW_LINK !== 'false';
}

export async function createPasswordReset({ request, email, role }) {
  await run(`
    DELETE FROM password_reset_tokens
    WHERE used_at IS NOT NULL OR expires_at <= datetime('now', '-1 day')
  `);

  const message = 'Se o e-mail existir, enviaremos instrucoes para redefinir a senha.';
  const user = await one('SELECT id, email, role FROM users WHERE email = ? AND role = ?', [email, role]);
  if (!user) return { ok: true, message };

  await run(`
    UPDATE password_reset_tokens SET used_at = datetime('now')
    WHERE user_id = ? AND used_at IS NULL
  `, [user.id]);

  const token = crypto.randomBytes(32).toString('base64url');
  const minutes = resetMinutes();
  const expiresAt = new Date(Date.now() + minutes * 60 * 1000).toISOString();

  await run(`
    INSERT INTO password_reset_tokens (user_id, token_hash, requested_role, expires_at)
    VALUES (?, ?, ?, ?)
  `, [user.id, tokenHash(token), role, expiresAt]);

  const result = { ok: true, message, expiresInMinutes: minutes };
  if (shouldShowLink()) {
    const url = new URL(resetPageFor(role), new URL(request.url).origin);
    url.searchParams.set('reset', token);
    url.searchParams.set('email', user.email);
    result.resetToken = token;
    result.resetUrl = url.toString();
  }
  return result;
}

export async function resetPassword({ token, password }) {
  const row = await one(`
    SELECT t.id, t.user_id, u.role
    FROM password_reset_tokens t
    JOIN users u ON u.id = t.user_id
    WHERE t.token_hash = ?
      AND t.used_at IS NULL
      AND t.expires_at > datetime('now')
  `, [tokenHash(token)]);

  if (!row) return false;

  const hash = bcrypt.hashSync(password, 10);
  await run('UPDATE users SET password_hash = ? WHERE id = ?', [hash, row.user_id]);
  await run(`
    UPDATE password_reset_tokens SET used_at = datetime('now')
    WHERE user_id = ? AND used_at IS NULL
  `, [row.user_id]);
  return true;
}
