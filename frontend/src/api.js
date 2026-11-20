const BASE = import.meta.env.VITE_API_URL || '/api';
// Token compartilhado opcional. Fica embutido no bundle: use apenas com a API
// protegida por proxy/rede confiável, nunca em deploy público multiusuário.
const TOKEN = import.meta.env.VITE_API_TOKEN;

export class ApiError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.details = details;
  }
}

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (TOKEN) headers.Authorization = `Bearer ${TOKEN}`;

  let res;
  try {
    res = await fetch(`${BASE}${path}`, { headers, ...options });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new ApiError('Não foi possível conectar ao servidor.');
  }
  if (res.status === 204) return null;
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(body.error || 'Erro inesperado.', body.details);
  return body;
}

const json = (method, data) => ({ method, body: JSON.stringify(data) });

export const api = {
  list: ({ view, date, q, signal }) => {
    const params = new URLSearchParams({ view });
    if (view === 'today') params.set('date', date);
    if (q) params.set('q', q);
    return request(`/tasks?${params}`, { signal });
  },
  create: (data) => request('/tasks', json('POST', data)),
  update: (id, data) => request(`/tasks/${id}`, json('PUT', data)),
  setStatus: (id, status) => request(`/tasks/${id}/status`, json('PATCH', { status })),
  reschedule: (id, due_date) => request(`/tasks/${id}/reschedule`, json('PATCH', { due_date })),
  remove: (id) => request(`/tasks/${id}`, { method: 'DELETE' }),
};
