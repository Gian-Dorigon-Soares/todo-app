import { useRef, useState } from 'react';
import { api } from '../api.js';
import { isValidDate, todayISO } from '../utils/date.js';
import Modal from './Modal.jsx';

const TITLE_MAX = 120;
const DESCRIPTION_MAX = 2000;

/** Normalização equivalente à do servidor (trim em título e descrição). */
function normalize({ title, description, due_date }) {
  return { title: title.trim(), description: description.trim(), due_date };
}

function validate(values) {
  const { title, description, due_date } = normalize(values);
  const errors = {};
  if (!title) errors.title = 'O título é obrigatório.';
  else if (title.length > TITLE_MAX) errors.title = `Máximo de ${TITLE_MAX} caracteres.`;
  if (description.length > DESCRIPTION_MAX) errors.description = `Máximo de ${DESCRIPTION_MAX} caracteres.`;
  if (!isValidDate(due_date)) errors.due_date = 'Informe uma data válida.';
  return errors;
}

export default function TaskForm({ task, onSaved, onClose }) {
  const initial = useRef({
    title: task?.title ?? '',
    description: task?.description ?? '',
    due_date: task?.due_date ?? todayISO(),
  }).current;
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const set = (field) => (e) => setValues((v) => ({ ...v, [field]: e.target.value }));

  const dirty =
    values.title !== initial.title ||
    values.description !== initial.description ||
    values.due_date !== initial.due_date;

  // Esc, backdrop, ×, Cancelar: não joga fora o que foi digitado sem confirmar.
  function handleClose() {
    if (dirty && !window.confirm('Descartar as alterações não salvas?')) return;
    onClose();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const found = validate(values);
    setErrors(found);
    if (Object.keys(found).length) return;

    const payload = normalize(values);
    setSubmitting(true);
    try {
      const saved = task ? await api.update(task.id, payload) : await api.create(payload);
      onSaved(saved);
    } catch (err) {
      setErrors({ form: err.message, ...err.details });
      setSubmitting(false);
    }
  }

  return (
    <Modal title={task ? 'Editar tarefa' : 'Nova tarefa'} onClose={handleClose}>
      <form onSubmit={handleSubmit} noValidate className="form">
        <label className="field">
          <span>Título</span>
          <input
            type="text"
            value={values.title}
            onChange={set('title')}
            maxLength={TITLE_MAX}
            autoFocus
            aria-invalid={!!errors.title}
          />
          {errors.title && <small className="error">{errors.title}</small>}
        </label>

        <label className="field">
          <span>Descrição</span>
          <textarea
            rows={4}
            value={values.description}
            onChange={set('description')}
            maxLength={DESCRIPTION_MAX}
          />
          {errors.description && <small className="error">{errors.description}</small>}
        </label>

        <label className="field">
          <span>Data prevista</span>
          <input type="date" value={values.due_date} onChange={set('due_date')} aria-invalid={!!errors.due_date} />
          {errors.due_date && <small className="error">{errors.due_date}</small>}
        </label>

        {errors.form && <p className="error" role="alert">{errors.form}</p>}

        <div className="actions">
          <button type="button" className="btn" onClick={handleClose}>Cancelar</button>
          <button type="submit" className="btn primary" disabled={submitting}>
            {task ? 'Salvar alterações' : 'Criar tarefa'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
