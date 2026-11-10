import { createSeed, catalogBase } from '../../data/seed';
import type { Catalog, Database, Status, Ticket, User } from '../../types';
import { canManage as manages, canRead as reads } from '../../lib/permissions';
const KEY = 'signal-demo-v4';
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
export const canManage = (u: User, t: Ticket) => manages(u, t, db.users);
export const canRead = (u: User, t: Ticket) => reads(u, t, db.users);
export function assertManager(u: User, t: Ticket) {
  if (!canManage(u, t) && canRead(u, t))
    throw new Error(`Решение по обращению принимает ответственный: ${user(t.assigneeId).name}`);
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
  return clone({ ...catalogBase, demoMode: true, users: db.users, rules: db.rules });
}
export async function resetDemo() {
  await pause();
  db = createSeed();
  persist();
}
