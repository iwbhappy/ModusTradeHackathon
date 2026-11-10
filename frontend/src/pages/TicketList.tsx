import { QueueFilters } from './ticket-list/QueueFilters';
import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowDownWideNarrow, ArrowRight, Clock3, Plus, SlidersHorizontal } from 'lucide-react';
import { listTickets } from '../api';
import { useApp } from '../store';
import type { Ticket } from '../types';
import { cost, overdue } from '../lib/format';
import {
  Badge,
  Empty,
  ErrorMessage,
  Loading,
  PageTitle,
  Panel,
  TicketsTable,
} from '../components/ui';

export function TicketList({ mode }: { mode: 'mine' | 'inbox' }) {
  const { catalog, userId, revision } = useApp();
  const [params, setParams] = useSearchParams();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sort, setSort] = useState('date');
  useEffect(() => {
    let live = true;
    setLoading(true);
    setError('');
    listTickets(userId)
      .then((t) => {
        if (live) setTickets(t);
      })
      .catch((e) => {
        if (live) setError(e.message);
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [userId, revision]);
  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next);
  };
  const tab = params.get('tab') || 'Все';
  const search = params.get('search') || '';
  const filtered = useMemo(
    () =>
      tickets
        .filter(
          (t) =>
            (!search ||
              `${t.id} ${t.title} ${t.text}`.toLowerCase().includes(search.toLowerCase())) &&
            (!params.get('department') || t.targetDepartment === params.get('department')) &&
            (!params.get('category') || t.category === params.get('category')) &&
            (!params.get('status') || t.status === params.get('status')) &&
            (!params.get('priority') || t.priority === params.get('priority')) &&
            (!params.get('deadline') ||
              (params.get('deadline') === 'overdue'
                ? overdue(t)
                : !overdue(t) &&
                  !['Реализовано', 'Закрыто', 'Отклонено'].includes(t.status) &&
                  new Date(t.dueAt).getTime() - Date.now() < 3 * 86400000)) &&
            (tab === 'Все' ||
              (tab === 'Новые'
                ? t.status === 'Новое'
                : tab === 'Просрочены'
                  ? overdue(t)
                  : tab === 'Ждут уточнения'
                    ? t.status === 'Ожидает уточнения'
                    : t.status === 'В работе' || t.status === 'Возвращено автором')),
        )
        .sort((a, b) =>
          sort === 'cost'
            ? cost(b) - cost(a)
            : sort === 'deadline'
              ? a.dueAt.localeCompare(b.dueAt)
              : b.createdAt.localeCompare(a.createdAt),
        ),
    [tickets, params, search, tab, sort],
  );
  if (!catalog) return null;
  const actionTickets = tickets.filter(
    (t) => t.authorId === userId && ['Ожидает уточнения', 'Реализовано'].includes(t.status),
  );
  return (
    <>
      <PageTitle
        title={mode === 'mine' ? 'Мои обращения' : 'Входящие'}
        subtitle={
          mode === 'mine'
            ? 'Ваши обращения и проблемы, к которым вы присоединились'
            : 'Обращения, назначенные вам и вашему подразделению'
        }
        action={
          mode === 'mine' ? (
            <Link className="button primary" to="/new">
              <Plus size={17} />
              Новое обращение
            </Link>
          ) : (
            <div className="quiet-label">
              <Clock3 size={16} />
              Сроки в рабочих днях
            </div>
          )
        }
      />
      {mode === 'mine' && actionTickets.length > 0 && (
        <section className="action-needed">
          <div className="section-label">
            <Clock3 size={16} />
            <strong>Требуют вашего действия</strong>
            <span className="count">{actionTickets.length}</span>
          </div>
          <div className="action-needed-items">
            {actionTickets.map((t) => (
              <Link to={`/tickets/${t.id}`} key={t.id}>
                <div>
                  <span className="mono">{t.id}</span>
                  <strong>{t.title}</strong>
                  <small>
                    {t.status === 'Реализовано'
                      ? 'Проверьте и подтвердите результат'
                      : 'Ответственный запросил уточнение'}
                  </small>
                </div>
                <ArrowRight size={18} />
              </Link>
            ))}
          </div>
        </section>
      )}
      <Panel>
        <div className="list-tabs" role="group" aria-label="Быстрые фильтры">
          {(mode === 'mine'
            ? ['Все', 'В работе', 'Ждут уточнения']
            : ['Все', 'Новые', 'Просрочены', 'Ждут уточнения', 'В работе']
          ).map((name) => (
            <button
              key={name}
              className={`${tab === name ? 'active' : ''} ${name === 'Просрочены' ? 'amber-tab' : ''}`}
              onClick={() => set('tab', name)}
            >
              {name}
              <span>
                {
                  tickets.filter(
                    (t) =>
                      name === 'Все' ||
                      (name === 'Новые'
                        ? t.status === 'Новое'
                        : name === 'Просрочены'
                          ? overdue(t)
                          : name === 'Ждут уточнения'
                            ? t.status === 'Ожидает уточнения'
                            : ['В работе', 'Возвращено автором'].includes(t.status)),
                  ).length
                }
              </span>
            </button>
          ))}
        </div>
        <QueueFilters mode={mode} params={params} setParams={setParams} set={set} />
        <div className="table-toolbar">
          <span>
            <SlidersHorizontal size={14} />
            Найдено: <strong className="mono">{filtered.length}</strong>
          </span>
          <label>
            <ArrowDownWideNarrow size={15} />
            <select aria-label="Сортировка" value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="date">Сначала новые</option>
              <option value="deadline">По сроку решения</option>
              {mode === 'inbox' && <option value="cost">По стоимости проблемы</option>}
            </select>
          </label>
        </div>
        <ErrorMessage text={error} />
        {loading ? (
          <Loading />
        ) : tickets.length ? (
          <TicketsTable tickets={filtered} users={catalog.users} showCost={mode === 'inbox'} />
        ) : (
          <Empty>
            <Link to="/new">Создать обращение</Link>
          </Empty>
        )}
        <div className="table-footer">
          <span>
            Показано {filtered.length} из {tickets.length}
          </span>
          <span>
            {mode === 'mine'
              ? 'Свои и присоединённые обращения'
              : 'Личные назначения и подразделение ответственного'}
          </span>
        </div>
      </Panel>
      <div className="list-note">
        <Badge status="Реализовано" />
        <span>
          После реализации автор подтверждает результат. Только тогда обращение закрывается.
        </span>
      </div>
    </>
  );
}
