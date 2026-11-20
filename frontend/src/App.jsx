import { useCallback, useEffect, useRef, useState } from 'react';
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

/** Data local que se atualiza sozinha na virada da meia-noite (e ao voltar para a aba). */
function useToday() {
  const [today, setToday] = useState(todayISO);

  useEffect(() => {
    let timer;
    const schedule = () => {
      const now = new Date();
      const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1);
      timer = setTimeout(() => {
        setToday(todayISO());
        schedule();
      }, nextMidnight - now);
    };
    const refresh = () => setToday(todayISO());
    schedule();
    document.addEventListener('visibilitychange', refresh);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);

  return today;
}

export default function App() {
  const [view, setView] = useState('today');
  const [query, setQuery] = useState('');
  const q = useDebounced(query.trim());
  const today = useToday();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null); // tarefa aberta
  const [form, setForm] = useState(null); // { task? } | null
  const requestRef = useRef(0);
  const abortRef = useRef(null);

  const load = useCallback(async () => {
    // Descarta respostas antigas (troca de aba, busca rápida) e cancela o fetch anterior.
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const requestId = ++requestRef.current;

    setError('');
    try {
      const data = await api.list({ view, date: today, q, signal: controller.signal });
      if (requestId !== requestRef.current) return;
      setTasks(data);
    } catch (err) {
      if (err.name === 'AbortError' || requestId !== requestRef.current) return;
      setError(err.message);
    } finally {
      if (requestId === requestRef.current) setLoading(false);
    }
  }, [view, q, today]);

  useEffect(() => {
    setLoading(true);
    load();
    return () => abortRef.current?.abort();
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
        <div className="page-fixed">
          <header className="page-head">
            <div>
              <h1>{VIEWS[view].label}</h1>
              {view === 'today' && <p className="subtitle">{formatLong(today)}</p>}
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
        </div>

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
