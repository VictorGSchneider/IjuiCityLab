// Helpers de resposta JSON e tratamento de erros para as rotas SSR do Astro.

export function json(data, status = 200, headers = {}) {
  return new Response(data === null ? '' : JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers },
  });
}

export function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

// Envolve um handler async, convertendo exceções em respostas JSON consistentes.
export function handler(fn) {
  return async (ctx) => {
    try {
      return await fn(ctx);
    } catch (err) {
      const status = err.status || 500;
      if (status >= 500) console.error('[api error]', err);
      return json({ error: err.message || 'Erro interno' }, status);
    }
  };
}

export async function readBody(request) {
  try {
    const text = await request.text();
    return text ? JSON.parse(text) : {};
  } catch {
    throw httpError(400, 'Corpo da requisição inválido (esperado JSON)');
  }
}
