import { ArrowUpRight, Clock3 } from 'lucide-react';

import type { Analytics, AnalyticsFilters } from '../../types';
import { number } from '../../lib/format';
import { Panel } from '../../components/ui';
export function SlaPanel({
  data,
  show,
}: {
  data: Analytics;
  show: (title: string, filters: AnalyticsFilters) => void;
}) {
  return (
    <Panel title="Контроль SLA" aside={<Clock3 size={17} />}>
      <div className="sla-summary">
        <strong className="mono overdue">{data.overdueCount}</strong>
        <span>
          просрочено из {data.openCount} открытых ·{' '}
          {number(data.openCount ? (data.overdueCount / data.openCount) * 100 : 0)}%
        </span>
      </div>
      <div className="sla-list">
        {data.sla
          .filter((row) => row.count)
          .sort((a, b) => b.count - a.count)
          .map(({ department, count }) => (
            <button
              key={department}
              onClick={() =>
                show(`Просрочены · ${department}`, {
                  assigneeDepartment: department,
                  overdue: true,
                })
              }
            >
              <span>{department}</span>
              <span className="sla-bar">
                <i
                  style={{
                    width: `${(count / Math.max(1, data.overdueCount)) * 100}%`,
                  }}
                />
              </span>
              <strong className="mono overdue">{count}</strong>
              <ArrowUpRight size={14} />
            </button>
          ))}
      </div>
      {!data.overdueCount && <p className="panel-body muted">Просроченных обращений нет</p>}
    </Panel>
  );
}
