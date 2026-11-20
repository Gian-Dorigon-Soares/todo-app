import { useCallback, useEffect, useState } from 'react';
import { api } from './api.js';
import TaskDetail from './components/TaskDetail.jsx';
import TaskForm from './components/TaskForm.jsx';
import TaskList from './components/TaskList.jsx';
import { formatLong, todayISO } from './utils/date.js';

const VIEWS = {
  today: { label: 'Hoje', empty: 'Nenhuma tarefa para hoje.' },
  pending: { label: 'Pendentes', empty: 'Nenhuma tarefa pendente.' },
  completed: { label: 'Concluídas', empty: 'Nenhuma tarefa concluída.' },
};

function useDebounced(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function App() {
  const [view, setView] = useState('today');
  const [query, setQuery] = useState('');
  const q = useDebounced(query.trim());
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null); // tarefa aberta
  const [form, setForm] = useState(null); // { task? } | null

  const load = useCallback(async () => {
    setError('');
    try {
      setTasks(await api.list({ view, date: todayISO(), q }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [view, q]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  async function toggle(task) {
    try {
      await api.setStatus(task.id, task.status === 'completed' ? 'pending' : 'completed');
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  const afterChange = () => {
    setSelected(null);
    setForm(null);
    load();
  };

  return (
    <div className="app">
      <nav className="nav" aria-label="Principal">
        <span className="brand">Tarefas</span>
        {Object.entries(VIEWS).map(([key, { label }]) => (
          <button
            key={key}
            className={`nav-item ${view === key ? 'active' : ''}`}
            aria-current={view === key ? 'page' : undefined}
            onClick={() => setView(key)}
          >
            {label}
          </button>
        ))}
      </nav>

      <main className="main">
        <header className="page-head">
          <div>
            <h1>{VIEWS[view].label}</h1>
            {view === 'today' && <p className="subtitle">{formatLong(todayISO())}</p>}
          </div>
          <button className="btn primary" onClick={() => setForm({})}>Nova tarefa</button>
        </header>

        <input
          type="search"
          className="search"
          placeholder="Pesquisar por título ou descrição"
          aria-label="Pesquisar tarefas"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        {error && <p className="error" role="alert">{error}</p>}
        {loading ? (
          <p className="empty">Carregando…</p>
        ) : (
          <TaskList
            tasks={tasks}
            emptyText={q ? 'Nenhuma tarefa encontrada para a pesquisa.' : VIEWS[view].empty}
            onOpen={setSelected}
            onToggle={toggle}
          />
        )}
      </main>

      {selected && !form && (
        <TaskDetail
          task={selected}
          onClose={() => setSelected(null)}
          onChanged={afterChange}
          onDeleted={afterChange}
          onEdit={(task) => setForm({ task })}
        />
      )}
      {form && (
        <TaskForm task={form.task} onClose={() => setForm(null)} onSaved={afterChange} />
      )}
    </div>
  );
}
