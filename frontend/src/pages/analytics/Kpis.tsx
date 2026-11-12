import { useState } from 'react';
import { Table2, TrendingUp } from 'lucide-react';
import type { Analytics, AnalyticsFilters, MetricKey } from '../../types';
import { date, number } from '../../lib/format';
import { Delta, metricLabels } from '../../components/MetricCards';
import { KpiSparkline, shortDate } from './KpiSparkline';
import { businessDate } from '../../lib/period-data';

export function Kpis({
  data,
  show,
}: {
  data: Analytics;
  show: (title: string, filters: AnalyticsFilters) => void;
}) {
  const [tableMode, setTableMode] = useState(false);
  const event = (key: MetricKey) => (key === 'savedHours' ? ('implemented' as const) : key);
  const firstWeek = data.weekly[0],
    lastWeek = data.weekly[data.weekly.length - 1];
  const lastDate =
    lastWeek && (lastWeek.toDate > businessDate() ? businessDate() : lastWeek.toDate);
  const crossYear =
    firstWeek && lastDate && firstWeek.fromDate.slice(0, 4) !== lastDate.slice(0, 4);
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
            const metric = data.metrics[key];
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
                <KpiSparkline
                  metricKey={key}
                  values={metric.series}
                  weeks={data.weekly}
                  onOpen={(index) =>
                    show(`${metricLabels[key]} · ${date(data.weekly[index].fromDate)}`, {
                      event: event(key),
                      fromDate: data.weekly[index].fromDate,
                      toDate: data.weekly[index].toDate,
                    })
                  }
                />
                <small>
                  {firstWeek && lastDate
                    ? `${data.weekly.length} недель: ${crossYear ? date(firstWeek.fromDate) : shortDate(firstWeek.fromDate)} – ${crossYear ? date(lastDate) : shortDate(lastDate)}`
                    : 'Нет недельных данных'}
                  {metric.previous !== 0 && ` · ранее ${number(metric.previous)}`}
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
