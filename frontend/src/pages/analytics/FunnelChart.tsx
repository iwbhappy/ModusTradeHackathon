import { useState } from 'react';
import { Filter } from 'lucide-react';
import type { Analytics, AnalyticsFilters } from '../../types';
import { ChartPanel, BLUE_SCALE } from './ChartPanel';

export function FunnelChart({
  data,
  show,
}: {
  data: Analytics;
  show: (title: string, filters: AnalyticsFilters) => void;
}) {
  const [active, setActive] = useState<number | null>(null);
  const maximum = Math.max(1, data.funnel[0]?.value || 0);
  const rate = (index: number) =>
    index && data.funnel[index - 1].value
      ? Math.round((data.funnel[index].value / data.funnel[index - 1].value) * 100)
      : null;
  return (
    <ChartPanel
      title="Воронка обработки"
      icon={<Filter size={18} />}
      question="Где обращения застревают?"
      table={
        <table>
          <thead>
            <tr>
              <th>Этап</th>
              <th>Обращения</th>
              <th>От предыдущего</th>
            </tr>
          </thead>
          <tbody>
            {data.funnel.map((item, index) => (
              <tr key={item.key}>
                <td>
                  <button
                    className="text-button"
                    onClick={() => show(item.label, { stage: item.key })}
                  >
                    {item.label}
                  </button>
                </td>
                <td>{item.value}</td>
                <td>{rate(index) === null ? '—' : `${rate(index)}%`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      }
    >
      <div className="funnel-chart" aria-label="Число обращений, достигших этапа">
        <div className="viz-axis-label">Достигли этапа, обращений</div>
        {data.funnel.map((item, index) => (
          <button
            key={item.key}
            className="funnel-step"
            onMouseEnter={() => setActive(index)}
            onMouseLeave={() => setActive(null)}
            onFocus={() => setActive(index)}
            onBlur={() => setActive(null)}
            onClick={() => show(item.label, { stage: item.key })}
            title={`${item.label}: ${item.value}; ${rate(index) === null ? 'начало воронки' : rate(index) + '% от предыдущего этапа'}`}
          >
            <span className="funnel-label">{item.label}</span>
            <span className="funnel-track">
              <span
                style={{
                  width: `${(item.value / maximum) * 100}%`,
                  background: BLUE_SCALE[index + 1],
                }}
              />
            </span>
            <b className="mono">{item.value}</b>
            <small>{rate(index) === null ? '—' : `${rate(index)}%`}</small>
          </button>
        ))}
        <p className="viz-caption" role="status">
          {active === null
            ? 'Этапы накопительные: обращение достигало этапа хотя бы раз. Нажмите на строку.'
            : `${data.funnel[active].label}: ${data.funnel[active].value} обращений${rate(active) === null ? '' : ', ' + rate(active) + '% от предыдущего этапа'}.`}
        </p>
      </div>
    </ChartPanel>
  );
}
