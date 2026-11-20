import { formatDate, isOverdue } from '../utils/date.js';

export default function TaskList({ tasks, emptyText, onOpen, onToggle }) {
  if (!tasks.length) return <p className="empty">{emptyText}</p>;

  return (
    <ul className="task-list">
      {tasks.map((task) => {
        const done = task.status === 'completed';
        return (
          <li key={task.id} className={`task ${done ? 'done' : ''}`}>
            <button
              type="button"
              className="check"
              role="checkbox"
              aria-checked={done}
              aria-label={done ? `Reabrir "${task.title}"` : `Concluir "${task.title}"`}
              onClick={() => onToggle(task)}
            />
            <button type="button" className="task-main" onClick={() => onOpen(task)}>
              <span className="task-title">{task.title}</span>
              {task.description && <span className="task-desc">{task.description}</span>}
            </button>
            <time className={`task-date ${isOverdue(task) ? 'overdue' : ''}`} dateTime={task.due_date}>
              {formatDate(task.due_date)}
            </time>
          </li>
        );
      })}
    </ul>
  );
}
