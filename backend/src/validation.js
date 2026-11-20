export const TITLE_MAX = 120;
export const DESCRIPTION_MAX = 2000;

export function isValidDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  if (y < 1970 || y > 2100) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export function validateDueDate(value) {
  return isValidDate(value) ? null : 'Data prevista inválida.';
}

/** Valida e normaliza o corpo de criação/edição de tarefa. */
export function validateTaskInput(body = {}) {
  const errors = {};
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const description = typeof body.description === 'string' ? body.description.trim() : '';

  if (!title) errors.title = 'O título é obrigatório.';
  else if (title.length > TITLE_MAX) errors.title = `O título deve ter no máximo ${TITLE_MAX} caracteres.`;

  if (description.length > DESCRIPTION_MAX)
    errors.description = `A descrição deve ter no máximo ${DESCRIPTION_MAX} caracteres.`;

  const dateError = validateDueDate(body.due_date);
  if (dateError) errors.due_date = dateError;

  return { errors, data: { title, description, due_date: body.due_date } };
}
