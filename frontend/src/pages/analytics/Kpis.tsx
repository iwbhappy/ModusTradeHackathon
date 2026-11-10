import { useState } from 'react';
import { Table2, TrendingUp } from 'lucide-react';
import type { Analytics, AnalyticsFilters, MetricKey } from '../../types';
import { date, number } from '../../lib/format';
import { Delta, metricLabels } from '../../components/MetricCards';
import { onChartKey } from './ChartPanel';

export function Kpis({
  data,
  show,
}: {
  data: Analytics;
  show: (title: string, filters: AnalyticsFilters) => void;
}) {
  const [tableMode, setTableMode] = useState(false);
  const event = (key: MetricKey) => (key === 'savedHours' ? ('implemented' as const) : key);
  return (
    <section className="analytics-kpis" aria-labelledby="kpi-title">
      <div className="between">
        <h2 className="section-heading" id="kpi-title">
          <TrendingUp size={20} />
          Мы работаем лучше или хуже?
        </h2>
        <button
          className="chart-view-toggle"
          aria-pressed={tableMode}
          onClick={() => setTableMode((value) => !value)}
        >
          <Table2 size={14} />
          {tableMode ? 'Карточки' : 'Таблица'}
        </button>
      </div>
      {tableMode ? (
        <div className="table-wrap panel">
          <table>
            <thead>
              <tr>
                <th>Показатель</th>
                <th>Сейчас</th>
                <th>Ранее</th>
                <th>Дельта</th>
                {data.weekly.map((week) => (
                  <th key={week.start}>{date(week.fromDate)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(Object.keys(metricLabels) as MetricKey[]).map((key) => (
                <tr key={key}>
                  <th>{metricLabels[key]}</th>
                  <td>
                    <button
                      className="text-button"
                      onClick={() => show(metricLabels[key], { event: event(key) })}
                    >
                      {number(data.metrics[key].value)}
                    </button>
                  </td>
                  <td>{number(data.metrics[key].previous)}</td>
                  <td>
                    {data.metrics[key].previous === 0 ? (
                      <span className="metric-delta no-data">нет данных за прошлый период</span>
                    ) : (
                      number(data.metrics[key].delta)
                    )}
                  </td>
                  {data.metrics[key].series.map((value, index) => (
                    <td key={index}>
                      <button
                        className="text-button"
                        onClick={() =>
                          show(metricLabels[key], {
                            event: event(key),
                            fromDate: data.weekly[index].fromDate,
                            toDate: data.weekly[index].toDate,
                          })
                        }
                      >
                        {number(value)}
                      </button>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="report-kpis">
          {(Object.keys(metricLabels) as MetricKey[]).map((key) => {
            const metric = data.metrics[key],
              maximum = Math.max(1, ...metric.series);
            const x = (index: number) => 8 + (index * 144) / Math.max(1, metric.series.length - 1),
              y = (value: number) => 40 - (value / maximum) * 30;
            return (
              <div className={`metric-card metric-${key}`} key={key}>
                <span className="metric-label">{metricLabels[key]}</span>
                <button
                  className="metric-value-action"
                  title={
                    metric.previous === 0
                      ? 'Открыть обращения; нет данных за прошлый период'
                      : `Открыть обращения; предыдущий период: ${number(metric.previous)}`
                  }
                  onClick={() => show(metricLabels[key], { event: event(key) })}
                >
                  <strong className="metric-value">{number(metric.value)}</strong>
                </button>
                <Delta metric={metric} neutral={key === 'incoming'} />
                <svg
                  className="kpi-sparkline"
                  viewBox="0 0 160 48"
                  width="160"
                  height="48"
                  aria-label={`${metricLabels[key]}, последние 10 недель`}
                >
                  <polyline
                    points={metric.series
                      .map((value, index) => `${x(index)},${y(value)}`)
                      .join(' ')}
                    fill="none"
                    stroke={key === 'savedHours' ? '#17803D' : '#2A78D6'}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {metric.series.map((value, index) => (
                    <circle
                      key={index}
                      cx={x(index)}
                      cy={y(value)}
                      r="5"
                      fill="transparent"
                      tabIndex={0}
                      role="button"
                      aria-label={`${date(data.weekly[index].fromDate)}: ${number(value)}`}
                      onClick={() =>
                        show(`${metricLabels[key]} · ${date(data.weekly[index].fromDate)}`, {
                          event: event(key),
                          fromDate: data.weekly[index].fromDate,
                          toDate: data.weekly[index].toDate,
                        })
                      }
                      onKeyDown={(e) =>
                        onChartKey(e, () =>
                          show(metricLabels[key], {
                            event: event(key),
                            fromDate: data.weekly[index].fromDate,
                            toDate: data.weekly[index].toDate,
                          }),
                        )
                      }
                    >
                      <title>
                        {date(data.weekly[index].fromDate)}: {number(value)}
                      </title>
                    </circle>
                  ))}
                </svg>
                <small>
                  10 недель{metric.previous !== 0 && ` · ранее ${number(metric.previous)}`}
                </small>
              </div>
            );
          })}
        </div>
      )}
      <p className="data-note">
        Поступление — по регистрации, результаты — по датам событий. Дельта к равному предыдущему
        периоду. Рассмотрено: {number(data.considered)}% · медиана первого ответа:{' '}
        {number(data.medianHours)} раб. ч.
      </p>
    </section>
  );
}
