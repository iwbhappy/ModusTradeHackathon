import type { Frequency } from '../../types';
import { Field } from '../../components/ui';

export function CostFields({
  frequency,
  minutes,
  onChange,
}: {
  frequency: Frequency;
  minutes: number;
  onChange: (frequency: Frequency, minutes: number) => void;
}) {
  return (
    <div className="form-grid">
      <Field label="Как часто?">
        <select value={frequency} onChange={(e) => onChange(e.target.value as Frequency, minutes)}>
          {['ежедневно', 'еженедельно', 'ежемесячно', 'разово'].map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
      </Field>
      <Field label="Сколько времени теряете за раз?">
        <select value={minutes} onChange={(e) => onChange(frequency, Number(e.target.value))}>
          {[
            [15, '≈ 15 мин'],
            [30, '≈ 30 мин'],
            [60, '≈ 1 ч'],
            [120, '≈ 2 ч+'],
          ].map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </Field>
    </div>
  );
}
