import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Panel } from '../../components/ui';

const palette = [
  '#1E3A5F',
  '#48729A',
  '#7595B3',
  '#A3B7C9',
  '#C8D4DF',
  '#DDE4EA',
  '#5B7F78',
  '#99AAA5',
];
type Datum = { label: string; value: number };

export function Distribution({
  title,
  data,
  limit,
}: {
  title: string;
  data: Datum[];
  limit?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const top = limit ? data.slice(0, limit) : data;
  const remaining = limit ? data.slice(limit) : [];
  const otherCount = remaining.reduce((sum, item) => sum + item.value, 0);
  const displayed = remaining.length
    ? [...top, { label: `Прочие (${remaining.length})`, value: otherCount }]
    : top;
  const values = (value: number) => (
    <>
      <strong className="mono">{value}</strong>
      <small className="mono">{total ? Math.round((value / total) * 100) : 0}%</small>
    </>
  );
  return (
    <Panel title={title}>
      <div className="distribution">
        <div
          className="stacked-bar"
          role="img"
          aria-label={displayed.map((item) => `${item.label}: ${item.value}`).join(', ')}
        >
          {displayed.map((item, index) => (
            <span
              key={item.label}
              title={`${item.label}: ${item.value}`}
              style={{
                width: `${total ? (item.value / total) * 100 : 0}%`,
                background: palette[index % palette.length],
              }}
            />
          ))}
        </div>
        {top.map((item, index) => (
          <div className="distribution-row" key={item.label}>
            <span
              className="legend-square"
              style={{ background: palette[index % palette.length] }}
            />
            <span>{item.label}</span>
            {values(item.value)}
          </div>
        ))}
        {remaining.length > 0 && (
          <>
            <button
              className="distribution-row other-categories"
              aria-expanded={expanded}
              aria-controls="other-category-list"
              onClick={() => setExpanded(!expanded)}
            >
              <span className="legend-square" style={{ background: palette[7] }} />
              <span>
                Прочие ({remaining.length}){' '}
                {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </span>
              {values(otherCount)}
            </button>
            {expanded && (
              <div className="other-category-list" id="other-category-list">
                {remaining.map((item) => (
                  <div className="distribution-row" key={item.label}>
                    <span>{item.label}</span>
                    {values(item.value)}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </Panel>
  );
}
