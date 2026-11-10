import { businessDays } from '../../lib/format';
import type { RoutePreview, Rule } from '../../types';
import { db, pause, clone, user, persist } from './storage';
export function route(category: string, target: string): RoutePreview {
  const rule =
    db.rules.find((r) => r.category === category && r.department === target) ||
    db.rules.find((r) => r.category === category && !r.department);
  if (!rule) throw new Error('Для категории не настроена маршрутизация');
  const primary = user(rule.primaryId);
  const assignee = primary.vacation ? user(rule.backupId) : primary;
  if (assignee.vacation)
    throw new Error(
      'Основной и резервный ответственные отсутствуют. Администратору необходимо изменить правило.',
    );
  const now = new Date();
  return {
    assignee,
    primary,
    fallback: primary.vacation,
    responseDays: rule.responseDays,
    resolutionDays: rule.resolutionDays,
    responseDueAt: businessDays(now, rule.responseDays),
    dueAt: businessDays(now, rule.resolutionDays),
  };
}

export async function previewRouting(category: string, target: string) {
  await pause();
  return clone(route(category, target));
}
export async function saveRule(rule: Rule, userId: string) {
  await pause();
  if (user(userId).role !== 'Администратор') throw new Error('Нет доступа');
  if (
    rule.primaryId === rule.backupId ||
    rule.responseDays < 1 ||
    rule.resolutionDays < rule.responseDays ||
    !Number.isInteger(rule.responseDays) ||
    !Number.isInteger(rule.resolutionDays)
  )
    throw new Error('Нужны разные ответственные и целые сроки: решение не раньше первого ответа');
  if (
    db.rules.some(
      (r) => r.id !== rule.id && r.category === rule.category && r.department === rule.department,
    )
  )
    throw new Error('Для этого подразделения правило уже существует');
  db.rules = db.rules.map((r) => (r.id === rule.id ? clone(rule) : r));
  persist();
}
export async function setVacation(id: string, vacation: boolean, userId: string) {
  await pause();
  if (user(userId).role !== 'Администратор') throw new Error('Нет доступа');
  user(id).vacation = vacation;
  persist();
}
