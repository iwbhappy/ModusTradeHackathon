import type { Analytics } from '../../types';
import { number } from '../../lib/format';

interface Kpi {
  label: string;
  value: string;
  unit?: string;
  hint: string;
}

export function Kpis({ data }: { data: Analytics }) {
  const items: Kpi[] = [
    { label: 'Рассмотрено', value: number(data.considered), unit: '%', hint: 'Есть первый ответ' },
    {
      label: 'До первого ответа',
      value: number(data.medianHours),
      unit: 'раб. ч',
      hint: `Медиана · среднее ${number(data.averageHours)} раб. ч`,
    },
    {
      label: 'Результат зафиксирован',
      value: number(data.resultRate),
      unit: '%',
      hint: 'Решение или мотивированный отказ',
    },
    { label: 'Реализовано', value: `${data.implemented}`, hint: 'По дате реализации за период' },
    {
      label: 'Подтверждено авторами',
      value: `${data.confirmed}`,
      hint: `Ещё ${data.defaultConfirmed} закрыто без ответа автора`,
    },
  ];
  return (
    <div className="kpi-row">
      {items.map((item) => (
        <div className="kpi" key={item.label}>
          <span>{item.label}</span>
          <strong className="mono">
            {item.value}
            {item.unit && <em>{item.unit}</em>}
          </strong>
          <small>{item.hint}</small>
        </div>
      ))}
    </div>
  );
}
