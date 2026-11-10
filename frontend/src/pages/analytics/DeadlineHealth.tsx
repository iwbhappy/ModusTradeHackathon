import { useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock3 } from 'lucide-react';
import type { Analytics, AnalyticsFilters } from '../../types';
import { ChartPanel } from './ChartPanel';

const series = [
  { key: 'onTime' as const, label: 'В срок', icon: CheckCircle2 },
  { key: 'soon' as const, label: 'Скоро срок', icon: Clock3 },
  { key: 'overdue' as const, label: 'Просрочено', icon: AlertTriangle },
];
export function DeadlineHealth({
  data,
  show,
}: {
  data: Analytics;
  show: (title: string, filters: AnalyticsFilters) => void;
}) {
  const [hint, setHint] = useState('');
  const maximum = Math.max(
    1,
    ...data.deadlineHealth.map((row) => row.onTime + row.soon + row.overdue),
  );
  const open = (department: string, key: 'onTime' | 'soon' | 'overdue', label: string) =>
    show(`${department} · ${label}`, { assigneeDepartment: department, health: key });
  return (
    <ChartPanel
      title="Здоровье сроков"
      question="Какой отдел не справляется?"
      icon={<Clock3 size={18} />}
      table={
        <table>
          <thead>
            <tr>
              <th>Подразделение ответственного</th>
              {series.map((s) => (
                <th key={s.key}>{s.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.deadlineHealth.map((row) => (
              <tr key={row.department}>
                <th>{row.department}</th>
                {series.map((s) => (
                  <td key={s.key}>
                    <button
                      className="text-button"
                      onClick={() => open(row.department, s.key, s.label)}
                    >
                      {row[s.key]}
                    </button>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      }
    >
      <div className="health-chart">
        <div className="chart-legend">
          {series.map(({ key, label, icon: Icon }) => (
            <span key={key} className={`legend-${key}`}>
              <Icon size={14} />
              {label}
            </span>
          ))}
        </div>
        <p className="viz-axis-label">Подразделение ответственного · открытые обращения, шт.</p>
        {!data.deadlineHealth.length && (
          <p className="all-clear">
            <CheckCircle2 size={18} />
            Нет открытых обращений
          </p>
        )}
        {data.deadlineHealth.map((row) => {
          const total = row.onTime + row.soon + row.overdue;
          return (
            <div className="health-row" key={row.department}>
              <span>{row.department}</span>
              <div className="health-track">
                <div className="health-stack" style={{ width: `${(total / maximum) * 100}%` }}>
                  {series
                    .filter((s) => row[s.key])
                    .map((s) => {
                      const text = `${row.department} · ${s.label}: ${row[s.key]}`;
                      return (
                        <button
                          className={`health-segment health-${s.key}`}
                          style={{ flex: row[s.key] }}
                          key={s.key}
                          title={text}
                          aria-label={text}
                          onMouseEnter={() => setHint(text)}
                          onMouseLeave={() => setHint('')}
                          onFocus={() => setHint(text)}
                          onBlur={() => setHint('')}
                          onClick={() => open(row.department, s.key, s.label)}
                        >
                          <span>{row[s.key]}</span>
                        </button>
                      );
                    })}
                </div>
              </div>
              <strong className="mono">{total}</strong>
            </div>
          );
        })}
        <div className="health-ticks">
          <span>0</span>
          <span>{maximum} обращений</span>
        </div>
        <p className="viz-caption" role="status">
          {hint ||
            'Скоро срок — не более 3 рабочих дней. Сортировка по просроченным. Нажмите на сегмент.'}
        </p>
      </div>
    </ChartPanel>
  );
}
