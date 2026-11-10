import { useEffect, useState } from 'react';
import { Radar } from 'lucide-react';
import { createCluster, getEmerging } from '../../api';
import type { EmergingGroup } from '../../types';
import { useApp } from '../../store';
import { date, number } from '../../lib/format';
import { ErrorMessage, Panel } from '../../components/ui';

/**
 * Ранний сигнал: обращения вне известных кластеров, которые система сгруппировала
 * по смыслу. Руководитель направления оформляет группу в повторяющуюся проблему.
 */
export function EmergingProblems({
  canCreate,
  onCreated,
}: {
  canCreate: boolean;
  onCreated: () => void;
}) {
  const { userId, notify } = useApp();
  const [groups, setGroups] = useState<EmergingGroup[]>([]);
  const [editing, setEditing] = useState(-1);
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');
  const load = () =>
    getEmerging(userId)
      .then(setGroups)
      .catch(() => setGroups([]));
  useEffect(() => {
    load();
  }, [userId]);
  if (!groups.length) return null;
  const save = async (group: EmergingGroup) => {
    setError('');
    try {
      await createCluster(
        title,
        group.tickets.map((ticket) => ticket.id),
        userId,
      );
      notify(`Кластер «${title.trim()}» создан`);
      setEditing(-1);
      await load();
      onCreated();
    } catch (error) {
      setError((error as Error).message);
    }
  };
  return (
    <Panel
      title="Зарождающиеся проблемы"
      aside={
        <span className="quiet-label">
          <Radar size={15} />
          Ранний сигнал
        </span>
      }
    >
      <p className="panel-hint">
        Обращения вне известных кластеров, которые система сочла похожими по смыслу. Авторы из
        разных подразделений описали одну ситуацию разными словами.
      </p>
      <ErrorMessage text={error} />
      {groups.map((group, index) => (
        <div className="emerging-group" key={group.tickets[0].id}>
          <div className="emerging-summary">
            <strong>
              {group.tickets.length} обращения · {group.departments.join(', ')}
            </strong>
            <span>
              первое {date(group.firstSeen)} · ≈{' '}
              <span className="mono">{number(group.monthlyCost)}</span> чел.-ч/мес
            </span>
          </div>
          <ul>
            {group.tickets.map((ticket) => (
              <li key={ticket.id}>
                <span className="mono ticket-id">{ticket.id}</span>
                {ticket.title}
              </li>
            ))}
          </ul>
          {editing === index ? (
            <div className="emerging-form">
              <input
                value={title}
                maxLength={200}
                onChange={(event) => setTitle(event.target.value)}
                aria-label="Название повторяющейся проблемы"
              />
              <button className="primary" onClick={() => save(group)}>
                Создать кластер
              </button>
              <button onClick={() => setEditing(-1)}>Отмена</button>
            </div>
          ) : (
            canCreate && (
              <button
                onClick={() => {
                  setEditing(index);
                  setTitle(group.suggestedTitle);
                }}
              >
                Оформить как повторяющуюся проблему
              </button>
            )
          )}
        </div>
      ))}
    </Panel>
  );
}
