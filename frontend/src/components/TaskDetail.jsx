import { useState } from 'react';
import { api } from '../api.js';
import { formatDate, isOverdue, isValidDate } from '../utils/date.js';
import Modal from './Modal.jsx';

export default function TaskDetail({ task, onChanged, onDeleted, onEdit, onClose }) {
  const [mode, setMode] = useState('view'); // view | reschedule | delete
  const [date, setDate] = useState(task.due_date);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const completed = task.status === 'completed';

  async function run(action) {
    setBusy(true);
    setError('');
    try {
      await action();
    } catch (err) {
      setError(err.details?.due_date || err.message);
      setBusy(false);
    }
  }

  const toggleStatus = () =>
    run(async () => onChanged(await api.setStatus(task.id, completed ? 'pending' : 'completed')));

  const reschedule = () => {
    if (!isValidDate(date)) return setError('Informe uma data válida.');
    return run(async () => onChanged(await api.reschedule(task.id, date)));
  };

  const remove = () => run(async () => {
    await api.remove(task.id);
    onDeleted(task.id);
  });

  return (
    <Modal title={task.title} onClose={onClose}>
      <div className="detail">
        <p className="meta">
          <span className={`status ${task.status}`}>{completed ? 'Concluída' : 'Pendente'}</span>
          <span className={isOverdue(task) ? 'overdue' : ''}>{formatDate(task.due_date)}</span>
        </p>
        <p className="description">{task.description || 'Sem descrição.'}</p>

        {mode === 'reschedule' && (
          <div className="inline-panel">
            <label className="field">
              <span>Nova data</span>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} autoFocus />
            </label>
            <div className="actions">
              <button className="btn" onClick={() => setMode('view')}>Cancelar</button>
              <button className="btn primary" onClick={reschedule} disabled={busy}>Reagendar</button>
            </div>
          </div>
        )}

        {mode === 'delete' && (
          <div className="inline-panel">
            <p>Excluir esta tarefa? A ação não pode ser desfeita.</p>
            <div className="actions">
              <button className="btn" onClick={() => setMode('view')}>Cancelar</button>
              <button className="btn danger" onClick={remove} disabled={busy}>Excluir</button>
            </div>
          </div>
        )}

        {error && <p className="error" role="alert">{error}</p>}

        {mode === 'view' && (
          <div className="actions spread">
            <div className="actions">
              <button className="btn primary" onClick={toggleStatus} disabled={busy}>
                {completed ? 'Reabrir' : 'Concluir'}
              </button>
              <button className="btn" onClick={() => setMode('reschedule')}>Reagendar</button>
              <button className="btn" onClick={() => onEdit(task)}>Editar</button>
            </div>
            <button className="btn danger-text" onClick={() => setMode('delete')}>Excluir</button>
          </div>
        )}
      </div>
    </Modal>
  );
}
