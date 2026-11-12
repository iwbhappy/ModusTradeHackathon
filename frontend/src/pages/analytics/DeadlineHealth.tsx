import { useId, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock3 } from 'lucide-react';
import type { Analytics, AnalyticsFilters } from '../../types';
import { ChartPanel } from './ChartPanel';
import { ChartTooltip } from './ChartTooltip';

const series = [
  { key: 'onTime' as const, label: 'В срок', icon: CheckCircle2 },
  { key: 'soon' as const, label: 'Скоро срок (≤ 3 раб. дня)', icon: Clock3 },
  { key: 'overdue' as const, label: 'Просрочено', icon: AlertTriangle },
];
export function DeadlineHealth({
  data,
  show,
}: {
  data: Analytics;
  show: (title: string, filters: AnalyticsFilters) => void;
}) {
  const [hint, setHint] = useState<{ anchor: Element; text: string } | null>(null);
  const tooltipId = useId();
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
              <i className={`health-swatch health-${key}`} aria-hidden="true" />
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
                      const count = row[s.key];
                      const unit =
                        count % 10 === 1 && count % 100 !== 11
                          ? 'обращение'
                          : count % 10 >= 2 &&
                              count % 10 <= 4 &&
                              (count % 100 < 12 || count % 100 > 14)
                            ? 'обращения'
                            : 'обращений';
                      const text = `${row.department} · ${s.label}: ${count} ${unit}. Нажмите, чтобы открыть`;
                      return (
                        <button
                          className={`health-segment health-${s.key}`}
                          style={{ flex: row[s.key] }}
                          key={s.key}
                          aria-label={text}
                          aria-describedby={hint?.text === text ? tooltipId : undefined}
                          onMouseEnter={(event) => setHint({ anchor: event.currentTarget, text })}
                          onMouseLeave={(event) => {
                            if (document.activeElement !== event.currentTarget) setHint(null);
                          }}
                          onFocus={(event) => setHint({ anchor: event.currentTarget, text })}
                          onBlur={() => setHint(null)}
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
          Сортировка по просроченным. Нажмите на сегмент, чтобы открыть обращения.
        </p>
        <ChartTooltip
          anchor={hint?.anchor ?? null}
          text={hint?.text ?? ''}
          id={tooltipId}
          onDismiss={() => setHint(null)}
        />
      </div>
    </ChartPanel>
  );
}
