import { AlertTriangle, Check, Clock3 } from 'lucide-react';

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
  const latestResult = [...t.events]
    .reverse()
    .find((event) => event.status === 'Реализовано' || event.status === 'Отклонено')?.date;
  const previousResult = t.implementedAt || latestResult;
  const resultReopened =
    !terminal(t) &&
    (t.status === 'Возвращено автором' ||
      t.events.some((event) => event.status === 'Возвращено автором'));
  const facts = stageDefs.map((stage, i) => {
    if (i === 3) return resultReopened ? undefined : latestResult || t.implementedAt || t.closedAt;
    const event = t.events.find((e) => e.status && stage.statuses.includes(e.status));
    return event?.date || (i === 0 ? t.createdAt : i === 4 ? t.closedAt : undefined);
  });
  const currentStage =
    t.status === 'Реализовано'
      ? 4
      : terminal(t)
        ? -1
        : stageDefs.findIndex((stage) => stage.statuses.includes(t.status));

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
          const fact = facts[i];
          // Отказ не подтверждает прохождение пропущенных этапов.
          const passed =
            !fact &&
            t.status !== 'Отклонено' &&
            !(i === 3 && resultReopened) &&
            facts.slice(i + 1).some(Boolean);
          const skipped =
            terminal(t) && !fact && !passed && !(i === 4 && t.status === 'Реализовано');
          const current = i === currentStage;
          const late =
            !fact &&
            !passed &&
            !skipped &&
            !terminal(t) &&
            new Date(stage.plan).getTime() < Date.now();
          return (
            <li
              className={`${fact || passed ? 'complete' : ''} ${current ? 'current' : ''} ${late ? 'late' : ''}`}
              key={stage.title}
              aria-current={current ? 'step' : undefined}
            >
              <span className="track-circle">
                {current ? i + 1 : fact || passed ? <Check size={13} /> : skipped ? '—' : i + 1}
              </span>
              <div>
                <strong>{stage.title}</strong>
                <small>
                  {fact
                    ? date(fact)
                    : passed
                      ? 'Пройдено'
                      : skipped
                        ? 'Не потребовалось'
                        : `План: ${date(stage.plan)}`}
                </small>
                {late && (
                  <small className="tracking-late">
                    <AlertTriangle size={12} />
                    Плановый срок истёк
                  </small>
                )}
                {i === 3 && resultReopened && previousResult && (
                  <small>Прошлый результат: {date(previousResult)}, возвращён автором</small>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </Panel>
  );
}
