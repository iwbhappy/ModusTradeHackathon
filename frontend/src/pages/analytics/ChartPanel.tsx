import { useState, type ReactNode } from 'react';
import { ChartNoAxesCombined, Table2 } from 'lucide-react';
import { Panel } from '../../components/ui';

export function ChartPanel({
  title,
  question,
  children,
  table,
  icon,
}: {
  title: string;
  question: string;
  children: ReactNode;
  table: ReactNode;
  icon?: ReactNode;
}) {
  const [tableMode, setTableMode] = useState(false);
  return (
    <Panel
      title={title}
      icon={icon || <ChartNoAxesCombined size={18} />}
      className="visual-panel"
      aside={
        <button
          className="chart-view-toggle"
          aria-pressed={tableMode}
          onClick={() => setTableMode((value) => !value)}
        >
          <Table2 size={14} />
          {tableMode ? 'График' : 'Таблица'}
        </button>
      }
    >
      <p className="chart-question">{question}</p>
      <div hidden={tableMode}>{children}</div>
      <div hidden={!tableMode} className="table-wrap chart-table">
        {table}
      </div>
    </Panel>
  );
}
export const SERIES_COLORS = [
  '#2A78D6',
  '#EB6834',
  '#1BAF7A',
  '#EDA100',
  '#E87BA4',
  '#008300',
  '#6250D6',
  '#E34948',
];
export const BLUE_SCALE = [
  '#CDE2FB',
  '#9EC5F4',
  '#6DA7EC',
  '#3987E5',
  '#256ABF',
  '#184F95',
  '#0D366B',
];
export function onChartKey(event: React.KeyboardEvent, action: () => void) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    action();
  }
}
