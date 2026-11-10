import { useEffect, useRef, useState } from 'react';
import { Activity } from 'lucide-react';
import type { Analytics, AnalyticsFilters } from '../../types';
import { date } from '../../lib/format';
import { ChartPanel, onChartKey, SERIES_COLORS } from './ChartPanel';

export function WeeklyChart({
  data,
  show,
}: {
  data: Analytics['weekly'];
  show: (title: string, filters: AnalyticsFilters) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(620),
    [hovered, setHovered] = useState<number | null>(null);
  useEffect(() => {
    if (!container.current) return;
    const observer = new ResizeObserver(([entry]) =>
      setWidth(Math.max(300, entry.contentRect.width)),
    );
    observer.observe(container.current);
    return () => observer.disconnect();
  }, []);
  const maximum = Math.max(
    4,
    Math.ceil(Math.max(0, ...data.flatMap((w) => [w.incoming, w.done])) / 4) * 4,
  );
  const x = (i: number) => 44 + (i * (width - 70)) / Math.max(1, data.length - 1);
  const y = (value: number) => 244 - (value / maximum) * 202;
  const open = (index: number, event: 'incoming' | 'resolved') =>
    show(
      `${event === 'incoming' ? 'Поступило' : 'Решено'} · неделя с ${date(data[index].fromDate)}`,
      {
        event,
        fromDate: data[index].fromDate,
        toDate: data[index].toDate,
      },
    );
  const active = hovered === null ? null : data[hovered];
  const polygons: { points: string; growing: boolean }[] = [];
  for (let i = 1; i < data.length; i++) {
    const a = data[i - 1],
      b = data[i],
      left = a.incoming - a.done,
      right = b.incoming - b.done;
    if (left * right < 0) {
      const fraction = left / (left - right),
        crossX = x(i - 1) + (x(i) - x(i - 1)) * fraction,
        crossY = y(a.incoming + (b.incoming - a.incoming) * fraction);
      polygons.push(
        {
          points: `${x(i - 1)},${y(a.incoming)} ${crossX},${crossY} ${x(i - 1)},${y(a.done)}`,
          growing: left > 0,
        },
        {
          points: `${crossX},${crossY} ${x(i)},${y(b.incoming)} ${x(i)},${y(b.done)}`,
          growing: right > 0,
        },
      );
    } else
      polygons.push({
        points: `${x(i - 1)},${y(a.incoming)} ${x(i)},${y(b.incoming)} ${x(i)},${y(b.done)} ${x(i - 1)},${y(a.done)}`,
        growing: left + right > 0,
      });
  }
  return (
    <ChartPanel
      title="Динамика потока"
      icon={<Activity size={18} />}
      question="Успеваем ли разбирать поток?"
      table={
        <table>
          <thead>
            <tr>
              <th>Неделя с</th>
              <th>Поступило</th>
              <th>Решено</th>
              <th>Баланс потока</th>
            </tr>
          </thead>
          <tbody>
            {data.map((week, index) => (
              <tr key={week.start}>
                <td>{date(week.fromDate)}</td>
                <td>
                  <button className="text-button" onClick={() => open(index, 'incoming')}>
                    {week.incoming}
                  </button>
                </td>
                <td>
                  <button className="text-button" onClick={() => open(index, 'resolved')}>
                    {week.done}
                  </button>
                </td>
                <td>
                  {week.incoming - week.done > 0 ? '+' : ''}
                  {week.incoming - week.done}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      }
    >
      <div className="weekly-viz" ref={container}>
        <div className="chart-legend">
          <span>
            <i style={{ background: SERIES_COLORS[0] }} />
            Поступило
          </span>
          <span>
            <i style={{ background: SERIES_COLORS[1] }} />
            Решено
          </span>
        </div>
        <svg
          width="100%"
          height="294"
          viewBox={`0 0 ${width} 294`}
          role="img"
          aria-label="Поступило и решено за 10 недель; заливка показывает разницу"
        >
          <title>Две линии по одной шкале; нажмите точку для списка обращений</title>
          {[0, 1, 2, 3, 4].map((tick) => (
            <g key={tick}>
              <line
                x1={44}
                x2={width - 22}
                y1={y((tick * maximum) / 4)}
                y2={y((tick * maximum) / 4)}
                stroke="#E2E8F0"
              />
              <text
                x={34}
                y={y((tick * maximum) / 4) + 4}
                textAnchor="end"
                fontSize="12"
                fill="#4A5568"
              >
                {(tick * maximum) / 4}
              </text>
            </g>
          ))}
          <text x={44} y={22} fill="#4A5568" fontSize="12">
            Обращения, шт.
          </text>
          {polygons.map((polygon, i) => (
            <polygon
              key={i}
              points={polygon.points}
              fill={polygon.growing ? '#FCE7DC' : '#DDEBFB'}
            />
          ))}
          {(['incoming', 'done'] as const).map((key, i) => (
            <polyline
              key={key}
              points={data.map((row, index) => `${x(index)},${y(row[key])}`).join(' ')}
              fill="none"
              stroke={SERIES_COLORS[i]}
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ))}
          {hovered !== null && (
            <line
              x1={x(hovered)}
              x2={x(hovered)}
              y1={35}
              y2={244}
              stroke="#718096"
              strokeDasharray="3 3"
            />
          )}
          {data.map((week, index) => (
            <g
              key={week.start}
              onMouseEnter={() => setHovered(index)}
              onMouseLeave={() => setHovered(null)}
            >
              <rect
                x={x(index) - (width - 70) / Math.max(1, data.length - 1) / 2}
                y={32}
                width={(width - 70) / Math.max(1, data.length - 1)}
                height={213}
                fill="transparent"
                onClick={() => open(index, 'incoming')}
              />
              {(['incoming', 'done'] as const).map((key, color) => (
                <circle
                  key={key}
                  cx={x(index)}
                  cy={y(week[key])}
                  r="5"
                  fill={SERIES_COLORS[color]}
                  stroke="white"
                  strokeWidth="2"
                  tabIndex={0}
                  role="button"
                  aria-label={`${date(week.fromDate)} · ${key === 'incoming' ? 'Поступило' : 'Решено'}: ${week[key]}`}
                  onFocus={() => setHovered(index)}
                  onBlur={() => setHovered(null)}
                  onClick={() => open(index, key === 'incoming' ? 'incoming' : 'resolved')}
                  onKeyDown={(event) =>
                    onChartKey(event, () =>
                      open(index, key === 'incoming' ? 'incoming' : 'resolved'),
                    )
                  }
                >
                  <title>
                    {date(week.fromDate)}: {week[key]}
                  </title>
                </circle>
              ))}
              {(width > 600 || index % 3 === 0 || index === data.length - 1) && (
                <text x={x(index)} y={267} textAnchor="middle" fill="#4A5568" fontSize="12">
                  {date(week.fromDate).split(' ').slice(0, 2).join(' ')}
                </text>
              )}
            </g>
          ))}
          <text x={width - 22} y={289} textAnchor="end" fill="#4A5568" fontSize="12">
            Неделя начала периода
          </text>
        </svg>
        {active && hovered !== null && (
          <div
            className="viz-tooltip"
            role="tooltip"
            style={{ left: Math.max(0, Math.min(width - 230, x(hovered) - 100)) }}
          >
            <b>Неделя с {date(active.fromDate)}</b>
            <span>
              Поступило: {active.incoming} · решено: {active.done}
            </span>
            <span>
              Поступило − решено: {active.incoming - active.done > 0 ? '+' : ''}
              {active.incoming - active.done}
            </span>
          </div>
        )}
        <p className="viz-caption">
          Подложка: тёплая — поступило больше, чем решено, холодная — наоборот. Возвраты учитываются
          отдельно. Текущая неделя не завершена.
        </p>
      </div>
    </ChartPanel>
  );
}
