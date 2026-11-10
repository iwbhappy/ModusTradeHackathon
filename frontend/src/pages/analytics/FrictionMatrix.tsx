import { Grid2X2 } from 'lucide-react';

import type { Analytics, AnalyticsFilters } from '../../types';

import { Panel } from '../../components/ui';
export function FrictionMatrix({
  data,
  show,
}: {
  data: Analytics;
  show: (title: string, filters: AnalyticsFilters) => void;
}) {
  const matrixMax = Math.max(1, ...data.matrix.map((cell) => cell.count));
  const cells = (a: string, b: string) =>
    data.matrix.find((cell) => cell.authorDepartment === a && cell.targetDepartment === b)?.count ||
    0;

  return (
    <Panel
      title="Матрица межотдельного трения"
      className="matrix-panel"
      aside={
        <span className="quiet-label">
          <Grid2X2 size={15} />
          Нажмите на ячейку для просмотра
        </span>
      }
    >
      <div className="matrix-description">
        Строка — подразделение автора. Столбец — подразделение или процесс, к которому относится
        обращение.
      </div>
      <div className="table-wrap">
        <table className="heatmap">
          <thead>
            <tr>
              <th>
                Кто сообщает <span>→ о ком</span>
              </th>
              {data.departments.map((d) => (
                <th key={d}>{d}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.departments.map((a) => (
              <tr key={a}>
                <th>{a}</th>
                {data.departments.map((b) => {
                  const count = cells(a, b);
                  const strength = count / matrixMax;
                  const color = count
                    ? ['#EBF0F6', '#CBDAE8', '#95AFC9', '#567FA6', '#1E3A5F'][
                        Math.min(4, Math.floor(strength * 4))
                      ]
                    : '#F5F6F8';
                  return (
                    <td key={b}>
                      <button
                        title={`${a} → ${b}: ${count}`}
                        aria-label={`${a} сообщает о ${b}: ${count} обращений`}
                        onClick={() =>
                          show(`${a} → ${b}`, {
                            authorDepartment: a,
                            targetDepartment: b,
                            type: 'Проблема',
                          })
                        }
                        style={{ background: color, color: strength > 0.65 ? '#fff' : '#1E3A5F' }}
                        className="mono"
                      >
                        {count || '—'}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="heatmap-legend">
        <span>Меньше обращений</span>
        {['#F5F6F8', '#EBF0F6', '#CBDAE8', '#95AFC9', '#567FA6', '#1E3A5F'].map((c) => (
          <i key={c} style={{ background: c }} />
        ))}
        <span>Больше обращений</span>
      </div>
    </Panel>
  );
}
