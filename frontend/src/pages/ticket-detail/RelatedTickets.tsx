import { Link } from 'react-router-dom';
import { ScanSearch } from 'lucide-react';

import { useApp } from '../../store';
import type { Ticket } from '../../types';
import { cost, number } from '../../lib/format';
import { Panel } from '../../components/ui';

export function RelatedTickets({
  t,
  related,
  manager,
}: {
  t: Ticket;
  related: Ticket[];
  manager: boolean;
}) {
  const { catalog } = useApp();
  const id = t.id;
  return (
    <Panel title="Связанные обращения" aside={<ScanSearch size={16} />}>
      <div className="panel-body">
        <h3>{catalog!.clusters.find((c) => c.id === t.clusterId)?.title}</h3>
        <p className="small muted">Доступная вам часть кластера</p>
        <div className="cluster-cost">
          <strong className="mono">
            ≈ {number(related.reduce((sum, item) => sum + cost(item), 0))}
          </strong>
          <span>чел.-ч/мес</span>
        </div>
        <p className="small">
          {[
            ...new Set(
              related.flatMap((item) => [
                item.authorDepartment,
                item.targetDepartment,
                ...item.participants.map((p) => p.department),
              ]),
            ),
          ].join(', ')}
        </p>
        {related
          .filter((item) => item.id !== id)
          .slice(0, 6)
          .map((item) => (
            <Link className="related-link" to={`/tickets/${item.id}`} key={item.id}>
              <span className="mono">{item.id}</span>
              {item.title}
            </Link>
          ))}
        {manager && (
          <Link to={`/analytics?cluster=${t.clusterId}`} className="text-button">
            Весь кластер в аналитике
          </Link>
        )}
      </div>
    </Panel>
  );
}
