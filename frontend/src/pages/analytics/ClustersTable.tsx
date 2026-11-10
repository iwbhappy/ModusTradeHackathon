import { ArrowDown, ArrowUp, ArrowUpRight, ScanSearch } from 'lucide-react';

import type { Analytics, Ticket } from '../../types';
import { cost, number } from '../../lib/format';
import { Panel } from '../../components/ui';
export function ClustersTable({
  data,
  show,
}: {
  data: Analytics;
  show: (title: string, tickets: Ticket[]) => void;
}) {
  const tickets = data.tickets;
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
            {data.clusters.map((cluster) => {
              const list = tickets.filter((t) => t.clusterId === cluster.id);
              const delta = data.clusterTrends[cluster.id] || 0;
              return (
                <tr key={cluster.id}>
                  <td>
                    <button
                      className="text-button cluster-title"
                      onClick={() => show(cluster.title, list)}
                    >
                      {cluster.title}
                    </button>
                  </td>
                  <td className="numeric mono">{list.length}</td>
                  <td className="departments-cell">
                    {[
                      ...new Set(
                        list.flatMap((t) => [
                          t.authorDepartment,
                          t.targetDepartment,
                          ...t.participants.map((p) => p.department),
                        ]),
                      ),
                    ].join(', ') || '—'}
                  </td>
                  <td className="numeric mono">{number(list.reduce((s, t) => s + cost(t), 0))}</td>
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
                      onClick={() => show(cluster.title, list)}
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
