import { useState } from 'react';
import { api } from '../api.js';
import { isValidDate, todayISO } from '../utils/date.js';
import Modal from './Modal.jsx';

const TITLE_MAX = 120;
const DESCRIPTION_MAX = 2000;

function validate({ title, description, due_date }) {
  const errors = {};
  if (!title.trim()) errors.title = 'O título é obrigatório.';
  else if (title.trim().length > TITLE_MAX) errors.title = `Máximo de ${TITLE_MAX} caracteres.`;
  if (description.length > DESCRIPTION_MAX) errors.description = `Máximo de ${DESCRIPTION_MAX} caracteres.`;
  if (!isValidDate(due_date)) errors.due_date = 'Informe uma data válida.';
  return errors;
}

export default function TaskForm({ task, onSaved, onClose }) {
  const [values, setValues] = useState({
    title: task?.title ?? '',
    description: task?.description ?? '',
    due_date: task?.due_date ?? todayISO(),
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const set = (field) => (e) => setValues((v) => ({ ...v, [field]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    const found = validate(values);
    setErrors(found);
    if (Object.keys(found).length) return;

    setSubmitting(true);
    try {
      const saved = task ? await api.update(task.id, values) : await api.create(values);
      onSaved(saved);
    } catch (err) {
      setErrors({ form: err.message, ...err.details });
      setSubmitting(false);
    }
  }

  return (
    <Modal title={task ? 'Editar tarefa' : 'Nova tarefa'} onClose={onClose}>
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
          <textarea rows={4} value={values.description} onChange={set('description')} />
          {errors.description && <small className="error">{errors.description}</small>}
        </label>

        <label className="field">
          <span>Data prevista</span>
          <input type="date" value={values.due_date} onChange={set('due_date')} aria-invalid={!!errors.due_date} />
          {errors.due_date && <small className="error">{errors.due_date}</small>}
        </label>

        {errors.form && <p className="error" role="alert">{errors.form}</p>}

        <div className="actions">
          <button type="button" className="btn" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn primary" disabled={submitting}>
            {task ? 'Salvar alterações' : 'Criar tarefa'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
