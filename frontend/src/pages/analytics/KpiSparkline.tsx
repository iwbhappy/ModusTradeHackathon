import { useEffect, useId, useRef, useState } from 'react';
import type { Analytics, MetricKey } from '../../types';
import { date, number } from '../../lib/format';
import { businessDate } from '../../lib/period-data';
import { onChartKey } from './ChartPanel';
import { ChartTooltip } from './ChartTooltip';

export const shortDate = (value: string) => date(value).replace(/ \d{4}$/, '');
export function weekRange(from: string, to: string) {
  if (from.slice(0, 7) === to.slice(0, 7)) return `${Number(from.slice(8))}–${shortDate(to)}`;
  if (from.slice(0, 4) === to.slice(0, 4)) return `${shortDate(from)} – ${shortDate(to)}`;
  return `${date(from)} – ${date(to)}`;
}

export function KpiSparkline({
  metricKey,
  values,
  weeks,
  onOpen,
}: {
  metricKey: MetricKey;
  values: number[];
  weeks: Analytics['weekly'];
  onOpen: (index: number) => void;
}) {
  const [selection, setActive] = useState<{ index: number; anchor: Element } | null>(null);
  const container = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(240);
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => {
      if (entry.contentRect.width > 0) setWidth(entry.contentRect.width);
    });
    if (container.current) observer.observe(container.current);
    return () => observer.disconnect();
  }, []);
  const tooltipId = useId();
  const series = values.slice(0, weeks.length);
  const active = selection && selection.index < series.length ? selection : null;
  const maximum = Math.max(1, ...series);
  const labelWidth = Math.max(48, number(series[series.length - 1] ?? 0).length * 7.5);
  const x = (index: number) =>
    8 + (index * Math.max(0, width - labelWidth - 24)) / Math.max(1, series.length - 1);
  const y = (value: number) => 42 - (value / maximum) * 30;
  const color = metricKey === 'savedHours' ? '#17803D' : '#2A78D6';
  const today = businessDate();
  const describe = (index: number) => {
    const week = weeks[index],
      value = series[index];
    const unit =
      metricKey === 'savedHours'
        ? 'чел.-ч/мес'
        : value % 10 === 1 && value % 100 !== 11
          ? 'обращение'
          : value % 10 >= 2 && value % 10 <= 4 && (value % 100 < 12 || value % 100 > 14)
            ? 'обращения'
            : 'обращений';
    const unfinished = week.fromDate <= today && today <= week.toDate;
    return `Неделя ${weekRange(week.fromDate, week.toDate)} · ${number(value)} ${unit}${unfinished ? ' (неделя не завершена)' : ''}`;
  };
  if (!series.length) return <p className="small muted">Нет недельных данных</p>;
  const last = series.length - 1;
  return (
    <>
      <div ref={container} className="kpi-sparkline-wrap">
        <svg
          className="kpi-sparkline"
          viewBox={`0 0 ${width} 72`}
          width="100%"
          height="72"
          aria-label="Динамика по неделям; последняя точка — текущая неделя"
        >
          {active && (
            <line
              x1={x(active.index)}
              x2={x(active.index)}
              y1={y(series[active.index])}
              y2="56"
              stroke="#AEBED2"
              strokeWidth="1"
            />
          )}
          <polyline
            points={series.map((value, index) => `${x(index)},${y(value)}`).join(' ')}
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {series.map((value, index) => (
            <g key={weeks[index].start}>
              <circle
                cx={x(index)}
                cy={y(value)}
                r={active?.index === index ? 5 : index === last ? 3 : 0}
                fill={active?.index === index || index === last ? color : 'transparent'}
                stroke={active?.index === index ? 'white' : 'none'}
                strokeWidth="1"
                pointerEvents="none"
              />
              <circle
                cx={x(index)}
                cy={y(value)}
                r="8"
                fill="transparent"
                tabIndex={0}
                role="button"
                aria-label={`${describe(index)}. Открыть обращения этой недели`}
                aria-describedby={active?.index === index ? tooltipId : undefined}
                onMouseEnter={(event) => setActive({ index, anchor: event.currentTarget })}
                onMouseLeave={(event) => {
                  if (document.activeElement !== event.currentTarget) setActive(null);
                }}
                onFocus={(event) => setActive({ index, anchor: event.currentTarget })}
                onBlur={() => setActive(null)}
                onClick={() => onOpen(index)}
                onKeyDown={(event) => onChartKey(event, () => onOpen(index))}
              />
            </g>
          ))}
          <text
            x={x(last) + 9}
            y={y(series[last]) + 4}
            className="sparkline-current-value"
            fill={color}
            aria-hidden="true"
          >
            {number(series[last])}
          </text>
          <text
            x={x(last) + 9}
            y={y(series[last]) + 20}
            className="sparkline-current-label"
            aria-hidden="true"
          >
            сейчас
          </text>
        </svg>
      </div>
      <ChartTooltip
        anchor={active?.anchor ?? null}
        text={active ? describe(active.index) : ''}
        id={tooltipId}
        onDismiss={() => setActive(null)}
      />
    </>
  );
}
