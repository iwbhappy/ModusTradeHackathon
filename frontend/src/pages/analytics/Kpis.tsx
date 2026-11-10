import type { Analytics } from '../../types';
import { number } from '../../lib/format';

export function Kpis({ data }: { data: Analytics }) {
  return (
    <div className="kpi-row">
      {[
        ['Рассмотрено', `${number(data.considered)}%`, 'Есть первый ответ'],
        [
          'До первого ответа',
          `${number(data.medianHours)} раб. ч`,
          `Медиана · среднее ${number(data.averageHours)} раб. ч`,
        ],
        [
          'Результат зафиксирован',
          `${number(data.resultRate)}%`,
          'Решение или мотивированный отказ',
        ],
        ['Реализовано', `${data.implemented}`, 'По дате реализации за период'],
        ['Подтверждено авторами', `${data.confirmed}`, 'Результат проверен в работе'],
      ].map(([label, value, hint]) => (
        <div className="kpi" key={label}>
          <span>{label}</span>
          <strong className="mono">{value}</strong>
          <small>{hint}</small>
        </div>
      ))}
    </div>
  );
}
