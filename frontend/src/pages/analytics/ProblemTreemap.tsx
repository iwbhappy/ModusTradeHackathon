import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Map, Minus, TrendingDown, TrendingUp } from 'lucide-react';
import type { Analytics, AnalyticsFilters } from '../../types';
import { number } from '../../lib/format';
import { ChartPanel } from './ChartPanel';

type Cluster = Analytics['clusterStats'][number] & { grouped?: boolean };

function textLines(
  text: string,
  width: number,
  fontSize: number,
  context: CanvasRenderingContext2D | null,
) {
  if (context) context.font = `600 ${fontSize}px "Golos Text"`;
  const measure = (value: string) =>
    context?.measureText(value).width ?? value.length * fontSize * 0.65;
  let line = '',
    lines = 1;
  for (const word of text.split(/\s+/)) {
    if (measure(word) > width) return Infinity;
    const next = line ? `${line} ${word}` : word;
    if (measure(next) <= width) line = next;
    else {
      lines++;
      line = word;
    }
  }
  return lines;
}

function content(
  cluster: Cluster,
  width: number,
  height: number,
  context: CanvasRenderingContext2D | null,
) {
  const roomy = width >= 160 && height >= 96;
  const padding = roomy ? 10 : 4;
  const availableWidth = width - padding * 2 - 2;
  const titleHeight =
    textLines(cluster.title, availableWidth, roomy ? 14 : 12, context) * (roomy ? 18 : 16);
  const baseHeight = padding * 2 + titleHeight + 4 + (roomy ? 27.5 : 20);
  const details = cluster.grouped
    ? 'чел.-ч/мес'
    : `чел.-ч/мес · ${cluster.trend > 0 ? '+' : ''}${cluster.trend} обращений`;
  const showDetails =
    baseHeight + 4 + textLines(details, availableWidth, 12, context) * 16 <= height;
  return {
    fits: width >= 120 && height >= 64 && baseHeight <= height && (!cluster.grouped || showDetails),
    showDetails,
    details,
  };
}
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
  const map = useRef<HTMLDivElement>(null);
  const smallList = useRef<HTMLElement>(null);
  const listId = useId();
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [fontVersion, setFontVersion] = useState(0);
  const context = useMemo(() => document.createElement('canvas').getContext('2d'), []);
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0)
        setSize((old) => (old.width === width && old.height === height ? old : { width, height }));
    });
    if (map.current) observer.observe(map.current);
    let live = true;
    const fontsLoaded = () => {
      if (live) setFontVersion((version) => version + 1);
    };
    void document.fonts.ready.then(fontsLoaded);
    document.fonts.addEventListener('loadingdone', fontsLoaded);
    return () => {
      live = false;
      observer.disconnect();
      document.fonts.removeEventListener('loadingdone', fontsLoaded);
    };
  }, []);
  const { boxes, small } = useMemo(() => {
    let visible: Cluster[] = [...data.clusterStats]
      .filter((c) => c.monthlyCost > 0)
      .sort((a, b) => b.monthlyCost - a.monthlyCost || a.id.localeCompare(b.id));
    const small: Cluster[] = [];
    let includeGroup = true;
    while (true) {
      const group: Cluster[] =
        includeGroup && small.length
          ? [
              {
                ...small[0],
                grouped: true,
                id: '__small-problems__',
                title: `Ещё ${small.length} ${small.length % 10 === 1 && small.length % 100 !== 11 ? 'проблема' : small.length % 10 >= 2 && small.length % 10 <= 4 && (small.length % 100 < 12 || small.length % 100 > 14) ? 'проблемы' : 'проблем'}`,
                monthlyCost: small.reduce((sum, c) => sum + c.monthlyCost, 0),
                trend: 0,
              },
            ]
          : [];
      const boxes = layout([...visible, ...group], 0, 0, size.width, size.height);
      const hidden = boxes.filter(
        (box) =>
          !box.cluster.grouped &&
          !content(box.cluster, box.width - 2, box.height - 2, context).fits,
      );
      if (!hidden.length) {
        const aggregate = boxes.find((box) => box.cluster.grouped);
        const fitsAggregate =
          !aggregate ||
          content(aggregate.cluster, aggregate.width - 2, aggregate.height - 2, context).fits;
        if (!fitsAggregate) {
          includeGroup = false;
          continue;
        }
        return { boxes, small };
      }
      const hiddenIds = new Set(hidden.map((box) => box.cluster.id));
      small.push(...visible.filter((cluster) => hiddenIds.has(cluster.id)));
      visible = visible.filter((cluster) => !hiddenIds.has(cluster.id));
      includeGroup = true;
    }
  }, [data.clusterStats, size, context, fontVersion]);
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
        <div
          ref={map}
          className="treemap"
          aria-label="Площадь — оценка потерь, цвет — тренд обращений"
        >
          {!boxes.length && (
            <p className="all-clear">
              {small.length
                ? 'Небольшие проблемы перечислены под картой'
                : 'Нет оценок потерь для построения карты'}
            </p>
          )}
          {boxes.map(({ cluster, x, y, width, height }) => {
            const text = cluster.grouped
              ? `${cluster.title} · ${number(cluster.monthlyCost)} чел.-ч/мес. Перейти к списку небольших проблем`
              : `${cluster.title}: ≈ ${number(cluster.monthlyCost)} чел.-ч/мес; тренд ${cluster.trend > 0 ? '+' : ''}${cluster.trend}`;
            const { showDetails, details } = content(cluster, width - 2, height - 2, context);
            return (
              <button
                key={cluster.id}
                title={text}
                aria-label={text}
                aria-controls={cluster.grouped ? listId : undefined}
                className={`treemap-cell ${cluster.trend > 0 ? 'growing' : cluster.trend < 0 ? 'declining' : 'steady'}`}
                style={{
                  left: x + 1,
                  top: y + 1,
                  width: Math.max(0, width - 2),
                  height: Math.max(0, height - 2),
                }}
                onMouseEnter={() => setHint(text)}
                onMouseLeave={() => setHint('')}
                onFocus={() => setHint(text)}
                onBlur={() => setHint('')}
                onClick={() => {
                  if (!cluster.grouped) {
                    show(cluster.title, { cluster: cluster.id });
                    return;
                  }
                  smallList.current?.scrollIntoView({
                    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
                      ? 'auto'
                      : 'smooth',
                    block: 'nearest',
                  });
                  smallList.current?.focus({ preventScroll: true });
                }}
              >
                <div className="treemap-content" aria-hidden="true">
                  <span className="treemap-title">{cluster.title}</span>
                  <strong
                    className="mono"
                    style={{
                      fontSize: `min(var(--treemap-number-size, 16px), calc((100cqw - 24px) / ${number(cluster.monthlyCost).length} / 0.61))`,
                    }}
                  >
                    {number(cluster.monthlyCost)}
                  </strong>
                  {showDetails && <small>{details}</small>}
                </div>
              </button>
            );
          })}
        </div>
        {!!small.length && (
          <section
            ref={smallList}
            id={listId}
            tabIndex={-1}
            className="small-problems"
            aria-label="Небольшие проблемы"
          >
            <h3>Небольшие проблемы</h3>
            {small.map((cluster) => {
              const Icon =
                cluster.trend > 0 ? TrendingUp : cluster.trend < 0 ? TrendingDown : Minus;
              return (
                <button
                  key={cluster.id}
                  className="small-problem"
                  onClick={() => show(cluster.title, { cluster: cluster.id })}
                >
                  <Icon
                    size={16}
                    className={
                      cluster.trend > 0
                        ? 'trend-up'
                        : cluster.trend < 0
                          ? 'trend-down'
                          : 'trend-flat'
                    }
                    aria-label={
                      cluster.trend > 0
                        ? 'Рост обращений'
                        : cluster.trend < 0
                          ? 'Снижение обращений'
                          : 'Без изменений'
                    }
                  />
                  <span>{cluster.title}</span>
                  <strong className="mono">≈ {number(cluster.monthlyCost)} чел.-ч/мес</strong>
                  <small>
                    {cluster.count} обращений · тренд {cluster.trend > 0 ? '+' : ''}
                    {cluster.trend} обращений
                  </small>
                </button>
              );
            })}
          </section>
        )}
        <p className="viz-caption" role="status">
          {hint ||
            'Площадь — оценка месячных потерь. Тренд сравнивает последние 30 дней с предыдущими 30. Нажмите на проблему.'}
        </p>
      </div>
    </ChartPanel>
  );
}
