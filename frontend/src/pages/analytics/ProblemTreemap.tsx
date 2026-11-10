import { useState } from 'react';
import { Map, Minus, TrendingDown, TrendingUp } from 'lucide-react';
import type { Analytics, AnalyticsFilters } from '../../types';
import { number } from '../../lib/format';
import { ChartPanel } from './ChartPanel';

type Cluster = Analytics['clusterStats'][number];
function layout(
  items: Cluster[],
  x = 0,
  y = 0,
  width = 100,
  height = 100,
): { cluster: Cluster; x: number; y: number; width: number; height: number }[] {
  if (!items.length) return [];
  if (items.length === 1) return [{ cluster: items[0], x, y, width, height }];
  const total = items.reduce((sum, item) => sum + item.monthlyCost, 0);
  let size = 1,
    left = items[0].monthlyCost;
  while (size < items.length - 1 && left + items[size].monthlyCost / 2 < total / 2)
    left += items[size++].monthlyCost;
  const ratio = left / total;
  return width >= height
    ? [
        ...layout(items.slice(0, size), x, y, width * ratio, height),
        ...layout(items.slice(size), x + width * ratio, y, width * (1 - ratio), height),
      ]
    : [
        ...layout(items.slice(0, size), x, y, width, height * ratio),
        ...layout(items.slice(size), x, y + height * ratio, width, height * (1 - ratio)),
      ];
}
export function ProblemTreemap({
  data,
  show,
}: {
  data: Analytics;
  show: (title: string, filters: AnalyticsFilters) => void;
}) {
  const [hint, setHint] = useState('');
  const boxes = layout(
    [...data.clusterStats]
      .filter((c) => c.monthlyCost > 0)
      .sort((a, b) => b.monthlyCost - a.monthlyCost || a.id.localeCompare(b.id)),
  );
  return (
    <ChartPanel
      title="Карта повторяющихся проблем"
      question="Что чинить первым?"
      icon={<Map size={18} />}
      table={
        <table>
          <thead>
            <tr>
              <th>Проблема</th>
              <th>≈ чел.-ч/мес</th>
              <th>Тренд обращений</th>
            </tr>
          </thead>
          <tbody>
            {data.clusterStats.map((c) => (
              <tr key={c.id}>
                <td>
                  <button className="text-button" onClick={() => show(c.title, { cluster: c.id })}>
                    {c.title}
                  </button>
                </td>
                <td>{number(c.monthlyCost)}</td>
                <td>
                  {c.trend > 0 ? '+' : ''}
                  {c.trend}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      }
    >
      <div className="treemap-wrap">
        <div className="chart-legend">
          <span>
            <TrendingUp size={14} className="trend-up" />
            Рост обращений
          </span>
          <span>
            <TrendingDown size={14} className="trend-down" />
            Снижение
          </span>
          <span>
            <Minus size={14} />
            Без изменений
          </span>
        </div>
        <div className="treemap" aria-label="Площадь — оценка потерь, цвет — тренд обращений">
          {!boxes.length && <p className="all-clear">Нет оценок потерь для построения карты</p>}
          {boxes.map(({ cluster, x, y, width, height }) => {
            const text = `${cluster.title}: ≈ ${number(cluster.monthlyCost)} чел.-ч/мес; тренд ${cluster.trend > 0 ? '+' : ''}${cluster.trend}`;
            return (
              <button
                key={cluster.id}
                title={text}
                aria-label={text}
                className={`treemap-cell ${cluster.trend > 0 ? 'growing' : cluster.trend < 0 ? 'declining' : 'steady'}`}
                style={{ left: `${x}%`, top: `${y}%`, width: `${width}%`, height: `${height}%` }}
                onMouseEnter={() => setHint(text)}
                onMouseLeave={() => setHint('')}
                onFocus={() => setHint(text)}
                onBlur={() => setHint('')}
                onClick={() => show(cluster.title, { cluster: cluster.id })}
              >
                <span>{cluster.title}</span>
                <strong className="mono">≈ {number(cluster.monthlyCost)}</strong>
                <small>
                  чел.-ч/мес · {cluster.trend > 0 ? '+' : ''}
                  {cluster.trend} обращений
                </small>
              </button>
            );
          })}
        </div>
        <p className="viz-caption" role="status">
          {hint ||
            'Площадь — оценка месячных потерь. Тренд сравнивает последние 30 дней с предыдущими 30. Нажмите на проблему.'}
        </p>
      </div>
    </ChartPanel>
  );
}
