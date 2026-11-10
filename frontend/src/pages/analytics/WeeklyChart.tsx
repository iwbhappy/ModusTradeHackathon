import { useEffect, useMemo, useRef, useState } from 'react';
import type { Ticket } from '../../types';
import { date } from '../../lib/format';

export function WeeklyChart({ tickets }: { tickets: Ticket[] }) {
  const container = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(700);
  const [hovered, setHovered] = useState<number | null>(null);
  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const data = useMemo(() => {
    const current = new Date();
    current.setDate(current.getDate() - ((current.getDay() + 6) % 7));
    current.setHours(0, 0, 0, 0);
    return Array.from({ length: 10 }, (_, index) => {
      const start = new Date(current);
      start.setDate(start.getDate() - (9 - index) * 7);
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      return {
        start,
        incoming: tickets.filter(
          (ticket) => new Date(ticket.createdAt) >= start && new Date(ticket.createdAt) < end,
        ).length,
        done: tickets.filter(
          (ticket) =>
            ticket.implementedAt &&
            new Date(ticket.implementedAt) >= start &&
            new Date(ticket.implementedAt) < end &&
            ['Реализовано', 'Закрыто'].includes(ticket.status),
        ).length,
      };
    });
  }, [tickets]);
  const maximum = Math.max(3, ...data.flatMap((week) => [week.incoming, week.done]));
  const topTick = Math.ceil(maximum / 3) * 3;
  const plotWidth = Math.max(280, width) - 56;
  const step = plotWidth / data.length;
  const barWidth = Math.min(22, step * 0.28);
  const baseline = 213;
  const y = (value: number) => baseline - (value / topTick) * 183;
  const active = hovered === null ? null : data[hovered];
  return (
    <div className="weekly-chart" ref={container}>
      <svg
        viewBox={`0 0 ${Math.max(280, width)} 260`}
        width="100%"
        height="260"
        role="img"
        aria-label="Новые и реализованные обращения по неделям за последние 10 недель"
      >
        <title>Количество обращений по неделям</title>
        {[0, 1, 2, 3].map((tick) => {
          const value = (topTick * tick) / 3;
          return (
            <g key={tick}>
              <line x1="37" x2={width - 12} y1={y(value)} y2={y(value)} stroke="#E9EDF1" />
              <text x="29" y={y(value) + 4} textAnchor="end" fill="#6C7785" fontSize="11">
                {value}
              </text>
            </g>
          );
        })}
        <text x="37" y="14" fill="#6C7785" fontSize="11">
          Обращения, шт.
        </text>
        {data.map((week, index) => {
          const center = 37 + step * (index + 0.5);
          const label = `${date(week.start)}: новых ${week.incoming}, реализовано ${week.done}`;
          return (
            <g
              key={index}
              tabIndex={0}
              role="img"
              aria-label={label}
              onMouseEnter={() => setHovered(index)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered(index)}
              onBlur={() => setHovered(null)}
            >
              <title>{label}</title>
              <rect
                x={center - step / 2 + 2}
                y="22"
                width={step - 4}
                height="193"
                fill="transparent"
              />
              <rect
                x={center - barWidth - 2}
                y={y(week.incoming)}
                width={barWidth}
                height={baseline - y(week.incoming)}
                fill="#1E3A5F"
                rx="2"
              />
              <rect
                x={center + 2}
                y={y(week.done)}
                width={barWidth}
                height={baseline - y(week.done)}
                fill="#A3B7C9"
                rx="2"
              />
              <text x={center} y="237" textAnchor="middle" fill="#6C7785" fontSize="11">
                {date(week.start).split(' ').slice(0, 2).join(' ')}
              </text>
            </g>
          );
        })}
      </svg>
      <p className="weekly-chart-caption">Текущая неделя не завершена</p>
      {active && hovered !== null && (
        <div
          className="chart-tooltip"
          role="tooltip"
          style={{
            left: Math.max(0, Math.min(width - 190, 37 + step * (hovered + 0.5) - 85)),
          }}
        >
          <strong>Неделя с {date(active.start)}</strong>
          <span>
            Новые: <b>{active.incoming}</b>
          </span>
          <span>
            Реализовано: <b>{active.done}</b>
          </span>
        </div>
      )}
    </div>
  );
}
