import { Check, Clock3 } from 'lucide-react';

import { useApp } from '../../store';
import type { Ticket } from '../../types';
import { businessDays, date, deadline, overdue, terminal } from '../../lib/format';
import { Panel } from '../../components/ui';

export function Tracking({ t }: { t: Ticket }) {
  const { catalog } = useApp();
  const owner = catalog!.users.find((u) => u.id === t.assigneeId)!;
  const stageDefs = [
    { title: 'Зарегистрировано', statuses: ['Новое'], plan: t.createdAt },
    {
      title: 'Рассмотрение',
      statuses: ['На рассмотрении', 'Ожидает уточнения'],
      plan: t.responseDueAt,
    },
    {
      title: 'В работе',
      statuses: ['В работе', 'Возвращено автором'],
      plan: businessDays(new Date(t.responseDueAt), 1),
    },
    { title: 'Результат', statuses: ['Реализовано', 'Отклонено'], plan: t.dueAt },
    {
      title: t.status === 'Отклонено' ? 'Завершено' : 'Подтверждение',
      statuses: ['Закрыто'],
      plan: businessDays(new Date(t.dueAt), 3),
    },
  ];

  return (
    <Panel className="tracking-panel">
      <div className="tracking-summary">
        <div>
          <Clock3 size={17} />
          <strong className={overdue(t) ? 'overdue' : ''}>{deadline(t)}</strong>
        </div>
        <span>
          Ответственный: <b>{owner.name}</b>
        </span>
        <span>
          Обещанный срок решения: <b>{date(t.dueAt)}</b>
        </span>
      </div>
      <ol className="tracking">
        {stageDefs.map((stage, i) => {
          const event = t.events.find((e) => e.status && stage.statuses.includes(e.status));
          const fact =
            event?.date ||
            (i === 3 ? t.implementedAt || t.closedAt : i === 4 ? t.closedAt : undefined);
          const skipped = terminal(t) && !fact && !(i === 4 && t.status === 'Реализовано');
          return (
            <li className={fact ? 'complete' : ''} key={stage.title}>
              <span className="track-circle">
                {fact ? <Check size={13} /> : skipped ? '—' : i + 1}
              </span>
              <div>
                <strong>{stage.title}</strong>
                <small>
                  {fact ? date(fact) : skipped ? 'Не потребовалось' : `План: ${date(stage.plan)}`}
                </small>
              </div>
            </li>
          );
        })}
      </ol>
    </Panel>
  );
}
