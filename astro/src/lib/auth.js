import jwt from 'jsonwebtoken';
import { httpError } from './http.js';

const SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export function sign(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES_IN });
}

export function verify(token) {
  return jwt.verify(token, SECRET);
}

function bearer(request) {
  const h = request.headers.get('authorization') || '';
  return h.startsWith('Bearer ') ? h.slice(7) : null;
}

// Retorna o payload do token ou lança 401/403. `roles` opcional restringe o papel.
export function requireUser(request, roles) {
  const token = bearer(request);
  if (!token) throw httpError(401, 'Autenticação necessária');
  let payload;
  try {
    payload = verify(token);
  } catch {
    throw httpError(401, 'Token inválido ou expirado');
  }
  const allowed = Array.isArray(roles) ? roles : roles ? [roles] : null;
  if (allowed && !allowed.includes(payload.role)) {
    throw httpError(403, 'Permissão insuficiente');
  }
  return payload;
}

export function buildSession(user) {
  const token = sign({ sub: user.id, role: user.role, name: user.name, email: user.email });
  return {
    token,
    user: {
      id: user.id, name: user.name, email: user.email, role: user.role,
      company: user.company, cnpj: user.cnpj, phone: user.phone,
    },
  };
}
