import { ArrowUpRight, Clock3 } from 'lucide-react';

import type { Analytics, Ticket } from '../../types';
import { number, overdue, terminal } from '../../lib/format';
import { Panel } from '../../components/ui';
export function SlaPanel({
  data,
  show,
}: {
  data: Analytics;
  show: (title: string, tickets: Ticket[]) => void;
}) {
  const tickets = data.tickets;
  const open = tickets.filter((ticket) => !terminal(ticket));
  const late = open.filter(overdue);
  return (
    <Panel title="Контроль SLA" aside={<Clock3 size={17} />}>
      <div className="sla-summary">
        <strong className="mono overdue">{late.length}</strong>
        <span>
          просрочено из {open.length} открытых ·{' '}
          {number(open.length ? (late.length / open.length) * 100 : 0)}%
        </span>
      </div>
      <div className="sla-list">
        {data.departments
          .map((d) => ({
            d,
            list: tickets.filter(
              (t) => overdue(t) && data.users.find((u) => u.id === t.assigneeId)?.department === d,
            ),
          }))
          .filter((x) => x.list.length)
          .sort((a, b) => b.list.length - a.list.length)
          .map(({ d, list }) => (
            <button key={d} onClick={() => show(`Просрочены · ${d}`, list)}>
              <span>{d}</span>
              <span className="sla-bar">
                <i
                  style={{
                    width: `${(list.length / Math.max(1, tickets.filter(overdue).length)) * 100}%`,
                  }}
                />
              </span>
              <strong className="mono overdue">{list.length}</strong>
              <ArrowUpRight size={14} />
            </button>
          ))}
      </div>
      {!tickets.some(overdue) && <p className="panel-body muted">Просроченных обращений нет</p>}
    </Panel>
  );
}
