import { createSeed, catalogBase } from '../../data/seed';
import type { Catalog, Database, Status, Ticket, User } from '../../types';
const KEY = 'signal-demo-v3';
export let db: Database;
try {
  const stored = localStorage.getItem(KEY);
  const parsed = stored ? (JSON.parse(stored) as Database) : null;
  db =
    parsed?.version === 3 &&
    Array.isArray(parsed.tickets) &&
    Array.isArray(parsed.users) &&
    Array.isArray(parsed.rules)
      ? parsed
      : createSeed();
} catch {
  db = createSeed();
}
export const pause = () => new Promise<void>((resolve) => setTimeout(resolve, 160));
export const clone = <T>(value: T): T => structuredClone(value);
export function persist() {
  localStorage.setItem(KEY, JSON.stringify(db));
}
export const user = (id: string) => {
  const u = db.users.find((u) => u.id === id);
  if (!u) throw new Error('Пользователь не найден');
  return u;
};
export const ticket = (id: string) => {
  const t = db.tickets.find((t) => t.id === id);
  if (!t) throw new Error('Обращение не найдено');
  return t;
};
const canManage = (u: User, t: Ticket) =>
  u.role === 'Руководитель' &&
  (t.assigneeId === u.id ||
    (u.isDepartmentHead && user(t.assigneeId).department === u.department) ||
    (!!u.canViewCompanyAnalytics && !!t.escalated));
export const canRead = (u: User, t: Ticket) =>
  canManage(u, t) ||
  (u.role === 'Сотрудник' &&
    (t.authorId === u.id || t.participants.some((p) => p.userId === u.id)));
export function assertManager(u: User, t: Ticket) {
  if (!canManage(u, t))
    throw new Error('Действие доступно ответственному и руководителю его подразделения');
}
export function event(t: Ticket, actor: User, text: string, status?: Status) {
  const now = new Date().toISOString();
  t.events.push({ id: crypto.randomUUID(), date: now, actor: actor.name, text, status });
  if (actor.role === 'Руководитель' && !t.firstResponseAt) t.firstResponseAt = now;
}
export async function getCatalog(): Promise<Catalog> {
  await pause();
  return clone({ ...catalogBase, users: db.users, rules: db.rules });
}
export async function resetDemo() {
  await pause();
  db = createSeed();
  persist();
}
