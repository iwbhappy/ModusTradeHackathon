import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, ListFilter } from 'lucide-react';

import { useApp } from '../../store';
import type { Ticket } from '../../types';
import { cost, date, number } from '../../lib/format';
import { Badge, Empty, Modal } from '../../components/ui';
import { RootCause } from './RootCause';
import { getAnalyticsTickets } from '../../api';
import { canRead } from '../../lib/permissions';
export function Drilldown({
  drill,
  onClose,
}: {
  drill: { title: string; tickets: Ticket[]; clusterId?: string };
  onClose: () => void;
}) {
  const { selectUser, notify, catalog, userId } = useApp();
  const admin = catalog?.users.find((u) => u.id === userId)?.role === 'Администратор';
  const navigate = useNavigate();
  const openTicket = async (id: string) => {
    try {
      const t =
        drill.tickets.find((ticket) => ticket.id === id) ||
        (drill.clusterId
          ? (await getAnalyticsTickets(0, { cluster: drill.clusterId }, userId)).find(
              (ticket) => ticket.id === id,
            )
          : undefined);
      if (!t) throw new Error('Обращение больше не доступно в этом кластере');
      const actor = catalog?.users.find((u) => u.id === userId);
      if (actor && !canRead(actor, t, catalog!.users)) await selectUser(t.assigneeId);
      onClose();
      navigate(`/tickets/${id}`);
    } catch (error) {
      notify((error as Error).message);
    }
  };
  return (
    <Modal title={drill.title} onClose={onClose}>
      <div className="drill-summary">
        <ListFilter size={16} />
        {drill.tickets.length} обращений · ≈{' '}
        {number(drill.tickets.reduce((s, t) => s + cost(t), 0))} чел.-ч/мес
      </div>
      {drill.clusterId && (
        <RootCause clusterId={drill.clusterId} userId={userId} openTicket={openTicket} />
      )}
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
              <button
                className="text-button"
                onClick={async () => {
                  try {
                    if (!admin) await selectUser(t.assigneeId);
                    onClose();
                    navigate(`/tickets/${t.id}`);
                  } catch (error) {
                    notify((error as Error).message);
                  }
                }}
              >
                {admin ? 'Открыть обращение' : 'Открыть как ответственный'}{' '}
                <ArrowUpRight size={14} />
              </button>
            </article>
          ))}
        </div>
      )}
    </Modal>
  );
}
