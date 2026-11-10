import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Ticket, User } from '../../types';
import { cost, date, deadline, number, overdue } from '../../lib/format';
import { Badge } from './Badge';
import { Empty } from './Empty';
export function TicketsTable({
  tickets,
  users,
  showCost = false,
}: {
  tickets: Ticket[];
  users: User[];
  showCost?: boolean;
}) {
  if (!tickets.length) return <Empty text="По выбранным условиям ничего не найдено" />;
  return (
    <div className="table-wrap">
      <table className="tickets-table">
        <thead>
          <tr>
            <th>ID / Обращение</th>
            <th>Статус</th>
            <th>Ответственный</th>
            <th>Срок решения</th>
            {showCost && <th className="numeric">чел.-ч/мес</th>}
            <th>Последнее событие</th>
            <th>
              <span className="sr-only">Открыть</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {tickets.map((t) => (
            <tr key={t.id} className={overdue(t) ? 'overdue-row' : ''}>
              <td>
                <Link to={`/tickets/${t.id}`} className="ticket-link" title={t.title}>
                  <span className="mono ticket-id">{t.id}</span>
                  <span>{t.title}</span>
                </Link>
                <small className="ticket-meta">
                  {t.category} · {t.authorDepartment}
                </small>
                {t.priority === 'Высокий' && (
                  <span className="priority-high">Высокий приоритет</span>
                )}
              </td>
              <td>
                <Badge status={t.status} />
                {t.escalated && <Badge status="Эскалировано" />}
              </td>
              <td className="person-cell">{users.find((u) => u.id === t.assigneeId)?.name}</td>
              <td>
                <div className={overdue(t) ? 'overdue' : ''}>{deadline(t)}</div>
                <small>{date(t.dueAt)}</small>
              </td>
              {showCost && (
                <td className="numeric mono">{t.type === 'Проблема' ? number(cost(t)) : '—'}</td>
              )}
              <td className="event-cell">
                {t.events.at(-1)?.text}
                <small>{date(t.events.at(-1)?.date || t.createdAt)}</small>
              </td>
              <td>
                <Link aria-label={`Открыть ${t.id}`} to={`/tickets/${t.id}`}>
                  <ArrowUpRight size={16} />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
