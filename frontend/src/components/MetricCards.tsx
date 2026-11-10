import { ArrowDown, ArrowUp, Minus } from 'lucide-react';
import type { MetricKey, MetricValue } from '../types';
import { number } from '../lib/format';

export const metricLabels: Record<MetricKey, string> = {
  incoming: 'Поступило обращений',
  resolved: 'Решено',
  confirmed: 'Подтверждено авторами',
  savedHours: 'Сэкономлено ≈ чел.-ч/мес',
};
export function Delta({ metric, neutral = false }: { metric: MetricValue; neutral?: boolean }) {
  if (metric.previous === 0) {
    return <span className="metric-delta no-data">нет данных за прошлый период</span>;
  }
  const Icon = metric.delta > 0 ? ArrowUp : metric.delta < 0 ? ArrowDown : Minus;
  return (
    <span
      className={`metric-delta ${neutral || !metric.delta ? 'neutral' : metric.delta > 0 ? 'positive' : 'negative'}`}
      title={`Предыдущий равный период: ${number(metric.previous)}`}
    >
      <Icon size={14} />
      {metric.delta > 0 ? '+' : ''}
      {number(metric.delta)}
      <span>
        {metric.percent === null
          ? metric.value
            ? 'новое значение'
            : 'без изменений'
          : `${metric.percent > 0 ? '+' : ''}${number(metric.percent)}%`}
      </span>
    </span>
  );
}
export function MetricCards({ metrics }: { metrics: Record<MetricKey, MetricValue> }) {
  return (
    <div className="report-kpis">
      {(Object.keys(metricLabels) as MetricKey[]).map((key) => (
        <div className={`metric-card metric-${key}`} key={key}>
          <span className="metric-label">{metricLabels[key]}</span>
          <strong className="metric-value">{number(metrics[key].value)}</strong>
          <Delta metric={metrics[key]} neutral={key === 'incoming'} />
          {metrics[key].previous !== 0 && <small>Ранее: {number(metrics[key].previous)}</small>}
        </div>
      ))}
    </div>
  );
}
