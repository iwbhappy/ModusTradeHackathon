import { ArrowDown, ArrowUp, ArrowUpRight, ScanSearch } from 'lucide-react';

import type { Analytics, AnalyticsFilters } from '../../types';
import { number } from '../../lib/format';
import { Panel } from '../../components/ui';
export function ClustersTable({
  data,
  show,
}: {
  data: Analytics;
  show: (title: string, filters: AnalyticsFilters) => void;
}) {
  return (
    <Panel
      title="Повторяющиеся проблемы"
      aside={
        <span className="quiet-label">
          <ScanSearch size={15} />
          Анализ системы
        </span>
      }
    >
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Кластер</th>
              <th className="numeric">Обращения</th>
              <th>Затронутые подразделения</th>
              <th className="numeric">≈ чел.-ч/мес</th>
              <th className="numeric">Тренд за 30 дн.</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {data.clusterStats.map((cluster) => {
              const delta = cluster.trend;
              return (
                <tr key={cluster.id}>
                  <td>
                    <button
                      className="text-button cluster-title"
                      onClick={() => show(cluster.title, { cluster: cluster.id })}
                    >
                      {cluster.title}
                    </button>
                  </td>
                  <td className="numeric mono">{cluster.count}</td>
                  <td className="departments-cell">{cluster.departments.join(', ') || '—'}</td>
                  <td className="numeric mono">{number(cluster.monthlyCost)}</td>
                  <td className="numeric">
                    <span className="trend">
                      {delta > 0 ? (
                        <ArrowUp size={13} />
                      ) : delta < 0 ? (
                        <ArrowDown size={13} />
                      ) : null}
                      {delta > 0 ? '+' : ''}
                      {delta}
                    </span>
                  </td>
                  <td>
                    <button
                      className="icon-button"
                      aria-label={`Открыть кластер: ${cluster.title}`}
                      onClick={() => show(cluster.title, { cluster: cluster.id })}
                    >
                      <ArrowUpRight size={15} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="table-footer">
        <span>Оценки авторов и участников · ежедневно = 22, еженедельно = 4 раза в месяц</span>
        <span>Разовые потери не входят в месяц</span>
      </div>
    </Panel>
  );
}
