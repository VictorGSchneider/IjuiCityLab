import { httpError } from './http.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function str(v, { min = 1, max = 5000, required = true, label } = {}) {
  const value = typeof v === 'string' ? v.trim() : '';
  if (!value) {
    if (required) throw httpError(400, `Campo obrigatório: ${label}`);
    return null;
  }
  if (value.length < min) throw httpError(400, `${label} muito curto (mínimo ${min})`);
  if (value.length > max) throw httpError(400, `${label} muito longo (máximo ${max})`);
  return value;
}

export function email(v, { required = true, label = 'e-mail' } = {}) {
  const value = str(v, { required, label, max: 254 });
  if (!value) return null;
  if (!EMAIL_RE.test(value)) throw httpError(400, `${label} inválido`);
  return value.toLowerCase();
}

export function oneOf(v, allowed, label) {
  const value = str(v, { label });
  if (!allowed.includes(value)) throw httpError(400, `${label} inválido`);
  return value;
}

export function num(v, { min = -Infinity, max = Infinity, required = true, label } = {}) {
  if (v === undefined || v === null || v === '') {
    if (required) throw httpError(400, `Campo obrigatório: ${label}`);
    return null;
  }
  const n = Number(v);
  if (!Number.isFinite(n)) throw httpError(400, `${label} deve ser um número`);
  if (n < min || n > max) throw httpError(400, `${label} fora do intervalo (${min}–${max})`);
  return n;
}

export function slugify(s) {
  return String(s)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60) || 'projeto';
}
