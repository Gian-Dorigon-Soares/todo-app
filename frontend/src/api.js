const BASE = import.meta.env.VITE_API_URL || '/api';

export class ApiError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.details = details;
  }
}

async function request(path, options = {}) {
  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
  } catch {
    throw new ApiError('Não foi possível conectar ao servidor.');
  }
  if (res.status === 204) return null;
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(body.error || 'Erro inesperado.', body.details);
  return body;
}

const json = (method, data) => ({ method, body: JSON.stringify(data) });

export const api = {
  list: ({ view, date, q }) => {
    const params = new URLSearchParams({ view });
    if (view === 'today') params.set('date', date);
    if (q) params.set('q', q);
    return request(`/tasks?${params}`);
  },
  create: (data) => request('/tasks', json('POST', data)),
  update: (id, data) => request(`/tasks/${id}`, json('PUT', data)),
  setStatus: (id, status) => request(`/tasks/${id}/status`, json('PATCH', { status })),
  reschedule: (id, due_date) => request(`/tasks/${id}/reschedule`, json('PATCH', { due_date })),
  remove: (id) => request(`/tasks/${id}`, { method: 'DELETE' }),
};
