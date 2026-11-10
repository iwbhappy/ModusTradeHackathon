import { Grid2X2 } from 'lucide-react';

import type { Analytics, AnalyticsFilters } from '../../types';

import { Panel } from '../../components/ui';
import { BLUE_SCALE } from './ChartPanel';
import { useState } from 'react';
export function FrictionMatrix({
  data,
  show,
}: {
  data: Analytics;
  show: (title: string, filters: AnalyticsFilters) => void;
}) {
  const [tableMode, setTableMode] = useState(false);
  const matrixMax = Math.max(1, ...data.matrix.map((cell) => cell.count));
  const cells = (a: string, b: string) =>
    data.matrix.find((cell) => cell.authorDepartment === a && cell.targetDepartment === b)?.count ||
    0;

  return (
    <Panel
      title="Матрица межотдельного трения"
      className="matrix-panel"
      aside={
        <button
          className="chart-view-toggle"
          aria-pressed={tableMode}
          onClick={() => setTableMode((value) => !value)}
        >
          <Grid2X2 size={15} />
          {tableMode ? 'Тепловая карта' : 'Таблица'}
        </button>
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
                    ? BLUE_SCALE[Math.min(6, Math.floor(strength * 6))]
                    : '#F4F7FB';
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
                        style={{
                          background: tableMode ? '#FFFFFF' : color,
                          color: !tableMode && Math.floor(strength * 6) >= 4 ? '#fff' : '#0F1B2D',
                        }}
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
        {BLUE_SCALE.map((c) => (
          <i key={c} style={{ background: c }} />
        ))}
        <span>Больше обращений</span>
      </div>
    </Panel>
  );
}
