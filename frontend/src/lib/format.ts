import type { Frequency, Ticket } from '../types';
export const date = (value: string | Date) => { const d = new Date(value); return `${d.getDate()} ${['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'][d.getMonth()]} ${d.getFullYear()}`; };
export const number = (value: number) => new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 }).format(value);
export const terminal = (t: Ticket) => ['Реализовано', 'Отклонено', 'Закрыто'].includes(t.status);
export const overdue = (t: Ticket) => !terminal(t) && new Date(t.dueAt).getTime() < Date.now();
export const monthly = (frequency: Frequency, minutes: number) => minutes * ({ ежедневно: 22, еженедельно: 4, ежемесячно: 1, разово: 0 }[frequency]) / 60;
export const cost = (t: Ticket) => t.type === 'Проблема' ? monthly(t.frequency, t.minutes) + t.participants.reduce((sum, p) => sum + monthly(p.frequency, p.minutes), 0) : 0;
export function businessDays(from: Date, days: number) { const d = new Date(from); let count = 0; while (count < days) { d.setDate(d.getDate() + 1); if (![0, 6].includes(d.getDay())) count++; } return d.toISOString(); }
export function deadline(t: Ticket) {
  if (terminal(t)) return t.status === 'Реализовано' && !t.confirmed ? 'Ожидает подтверждения' : 'Рассмотрено';
  const end = new Date(t.dueAt); const now = new Date();
  if (end.getTime() < now.getTime()) return `просрочено на ${Math.max(1, Math.ceil((now.getTime() - end.getTime()) / 86400000))} дн.`;
  let n = 0; const d = new Date(now); while (d < end) { d.setDate(d.getDate() + 1); if (![0, 6].includes(d.getDay())) n++; }
  return `осталось ${n} раб. дн.`;
}
