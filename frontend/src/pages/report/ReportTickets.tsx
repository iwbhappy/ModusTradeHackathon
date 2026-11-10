import { useNavigate } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { Badge } from '../../components/ui';
import { useApp } from '../../store';
import type { ReportTicket } from '../../types';

export function ReportTickets({ tickets }: { tickets: ReportTicket[] }) {
  const { catalog, selectUser, notify } = useApp();
  const navigate = useNavigate();
  return (
    <div className="table-wrap">
      <table className="report-ticket-table">
        <thead>
          <tr>
            <th>Обращение</th>
            <th>Статус</th>
            <th>Что изменилось / причина отказа</th>
            <th className="no-print">Карточка</th>
          </tr>
        </thead>
        <tbody>
          {tickets.map((ticket) => (
            <tr key={ticket.id}>
              <td>
                <span className="mono ticket-id">{ticket.id}</span>
                <strong>{ticket.title}</strong>
              </td>
              <td>
                <Badge status={ticket.status} />
              </td>
              <td>
                <p
                  className="report-outcome"
                  title={ticket.status === 'Отклонено' ? ticket.rejection : ticket.changed}
                >
                  {(ticket.status === 'Отклонено' ? ticket.rejection : ticket.changed) ||
                    'Результат ещё не зафиксирован'}
                </p>
              </td>
              <td className="no-print">
                <button
                  className="text-button"
                  disabled={!ticket.canRead && !catalog?.demoMode}
                  onClick={async () => {
                    try {
                      if (!ticket.canRead) await selectUser(ticket.assigneeId);
                      navigate(`/tickets/${ticket.id}`);
                    } catch (error) {
                      notify((error as Error).message);
                    }
                  }}
                >
                  {ticket.canRead ? 'Открыть' : 'Открыть как ответственный'}
                  <ArrowUpRight size={14} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
