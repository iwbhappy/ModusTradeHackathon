import { Link } from 'react-router-dom';
import { ArrowUpRight, ListFilter } from 'lucide-react';

import { useApp } from '../../store';
import type { Ticket } from '../../types';
import { cost, date, number } from '../../lib/format';
import { Badge, Empty, Modal } from '../../components/ui';
export function Drilldown({
  drill,
  onClose,
}: {
  drill: { title: string; tickets: Ticket[] };
  onClose: () => void;
}) {
  const { selectUser } = useApp();
  return (
    <Modal title={drill.title} onClose={onClose}>
      <div className="drill-summary">
        <ListFilter size={16} />
        {drill.tickets.length} обращений · ≈{' '}
        {number(drill.tickets.reduce((s, t) => s + cost(t), 0))} чел.-ч/мес
      </div>
      {!drill.tickets.length ? (
        <Empty text="Обращений на этом стыке нет" />
      ) : (
        <div className="drill-list">
          {drill.tickets.map((t) => (
            <article key={t.id}>
              <div className="between">
                <span className="mono ticket-id">{t.id}</span>
                <Badge status={t.status} />
              </div>
              <h3>{t.title}</h3>
              <p className="small muted">
                {t.authorDepartment} → {t.targetDepartment} · {date(t.createdAt)}
              </p>
              <Link
                className="text-button"
                to={`/tickets/${t.id}`}
                onClick={() => {
                  selectUser(t.assigneeId);
                  onClose();
                }}
              >
                Открыть как ответственный <ArrowUpRight size={14} />
              </Link>
            </article>
          ))}
        </div>
      )}
    </Modal>
  );
}
