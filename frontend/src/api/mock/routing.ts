import { businessDays } from '../../lib/format';
import type { RoutePreview, Rule } from '../../types';
import { db, pause, clone, user, persist } from './storage';
export function route(category: string, target: string): RoutePreview {
  if (!target) {
    const categoryRule =
      db.rules.find((r) => r.category === category && !r.department) ||
      db.rules.find((r) => r.category === category) ||
      db.rules.find((r) => !r.category && !r.department);
    if (!categoryRule) throw new Error('Для категории не настроена маршрутизация');
    target = user(categoryRule.primaryId).department;
  }
  const rule =
    db.rules.find((r) => r.category === category && r.department === target) ||
    db.rules.find((r) => r.category === category && !r.department) ||
    db.rules.find((r) => !r.category && !r.department);
  if (!rule) throw new Error('Для категории не настроена маршрутизация');
  const primary = user(rule.primaryId);
  const backup = user(rule.backupId);
  const head = db.users.find(
    (user) => user.role === 'Руководитель' && user.isDepartmentHead && user.department === target,
  );
  const direction = db.users.find(
    (user) => user.role === 'Руководитель' && user.canViewCompanyAnalytics,
  );
  const assignee = !primary.vacation
    ? primary
    : !backup.vacation
      ? backup
      : (head && !head.vacation ? head : direction || head) ||
        db.users.find((user) => user.role === 'Руководитель');
  if (!assignee) throw new Error('В оргструктуре отсутствует руководитель для назначения');
  const now = new Date();
  return {
    assignee,
    primary,
    fallback: primary.vacation,
    reason: primary.vacation
      ? !backup.vacation
        ? 'Основной ответственный в отпуске; назначен резервный'
        : 'Назначено по резервному правилу: руководителю'
      : 'Назначено по правилу маршрутизации',
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
