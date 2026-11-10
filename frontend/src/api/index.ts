import { createSeed, catalogBase, detectCluster } from '../data/seed';
import { businessDays, overdue, terminal } from '../lib/format';
import type { Analytics, Catalog, Database, Frequency, RoutePreview, Rule, Status, Structure, Ticket, TicketDraft, TicketFilters, User } from '../types';

const KEY = 'signal-demo-v1';
let db: Database;
try { const stored = localStorage.getItem(KEY); const parsed = stored ? JSON.parse(stored) as Database : null; db = parsed?.version === 1 && Array.isArray(parsed.tickets) && Array.isArray(parsed.users) && Array.isArray(parsed.rules) ? parsed : createSeed(); } catch { db = createSeed(); }
const pause = () => new Promise<void>(resolve => setTimeout(resolve, 160));
const clone = <T,>(value: T): T => structuredClone(value);
function persist() { localStorage.setItem(KEY, JSON.stringify(db)); }
const user = (id: string) => { const u = db.users.find(u => u.id === id); if (!u) throw new Error('Пользователь не найден'); return u; };
const ticket = (id: string) => { const t = db.tickets.find(t => t.id === id); if (!t) throw new Error('Обращение не найдено'); return t; };
const canManage = (u: User, t: Ticket) => u.role === 'Руководитель' && (t.assigneeId === u.id || user(t.assigneeId).department === u.department);
const canRead = (u: User, t: Ticket) => canManage(u, t) || (u.role === 'Сотрудник' && (t.authorId === u.id || t.participants.some(p => p.userId === u.id)));
function assertManager(u: User, t: Ticket) { if (!canManage(u, t)) throw new Error('Действие доступно ответственному и руководителю его подразделения'); }
function event(t: Ticket, actor: User, text: string, status?: Status) { const now = new Date().toISOString(); t.events.push({ id: crypto.randomUUID(), date: now, actor: actor.name, text, status }); if (actor.role === 'Руководитель' && !t.firstResponseAt) t.firstResponseAt = now; }
function filterTickets(tickets: Ticket[], f: TicketFilters) { return tickets.filter(t => (!f.search || `${t.id} ${t.title} ${t.text}`.toLowerCase().includes(f.search.toLowerCase())) && (!f.department || t.targetDepartment === f.department) && (!f.category || t.category === f.category) && (!f.status || t.status === f.status) && (!f.priority || t.priority === f.priority) && (!f.overdue || overdue(t)) && (!f.cluster || t.clusterId === f.cluster) && (!f.authorDepartment || t.authorDepartment === f.authorDepartment) && (!f.targetDepartment || t.targetDepartment === f.targetDepartment)); }
export async function getCatalog(): Promise<Catalog> { await pause(); return clone({ ...catalogBase, users: db.users, rules: db.rules }); }
export async function listTickets(userId: string, filters: TicketFilters = {}): Promise<Ticket[]> { await pause(); return clone(filterTickets(db.tickets.filter(t => canRead(user(userId), t)), filters).sort((a, b) => b.createdAt.localeCompare(a.createdAt))); }
export async function getTicket(id: string, userId: string): Promise<Ticket> { await pause(); const t = ticket(id); if (!canRead(user(userId), t)) throw new Error('Обращение недоступно для выбранного пользователя. Выберите автора или ответственного.'); return clone(t); }
function route(category: string, target: string): RoutePreview {
  const rule = db.rules.find(r => r.category === category && r.department === target) || db.rules.find(r => r.category === category && !r.department);
  if (!rule) throw new Error('Для категории не настроена маршрутизация');
  const primary = user(rule.primaryId); const assignee = primary.vacation ? user(rule.backupId) : primary;
  if (assignee.vacation) throw new Error('Основной и резервный ответственные отсутствуют. Администратору необходимо изменить правило.');
  const now = new Date(); return { assignee, primary, fallback: primary.vacation, responseDays: rule.responseDays, resolutionDays: rule.resolutionDays, responseDueAt: businessDays(now, rule.responseDays), dueAt: businessDays(now, rule.resolutionDays) };
}
export async function previewRouting(category: string, target: string) { await pause(); return clone(route(category, target)); }
export async function createTicket(draft: TicketDraft, userId: string) {
  await pause(); const author = user(userId); if (author.role !== 'Сотрудник') throw new Error('Подача доступна в роли сотрудника');
  if (draft.text.trim().length < 20) throw new Error('Опишите ситуацию: минимум 20 символов');
  const routing = route(draft.category, draft.targetDepartment); const now = new Date().toISOString();
  const t: Ticket = { ...clone(draft), id: `N-${String(db.tickets.filter(t => t.id.startsWith('N-')).length + 1).padStart(3, '0')}`, text: draft.text.trim(), title: draft.text.trim().split(/[.!?\n]/)[0].slice(0, 100), authorId: userId, authorDepartment: author.department, assigneeId: routing.assignee.id, status: 'Новое', createdAt: now, responseDueAt: routing.responseDueAt, dueAt: routing.dueAt, events: [], comments: [], participants: [], changed: '', rejection: '', confirmed: false, clusterId: detectCluster(draft.text) };
  event(t, author, `Зарегистрировано. Назначен: ${routing.assignee.name}${routing.fallback ? ' (резервный: основной в отпуске)' : ''}. Первый ответ до ${new Date(routing.responseDueAt).toLocaleDateString('ru-RU')}`, 'Новое');
  db.tickets.push(t); persist(); return clone(t);
}
export async function updateStatus(id: string, status: Status, text: string, userId: string) {
  await pause(); const t = ticket(id); const actor = user(userId); assertManager(actor, t);
  if (!['На рассмотрении', 'В работе', 'Ожидает уточнения', 'Реализовано', 'Отклонено'].includes(status)) throw new Error('Этот статус устанавливается отдельным действием автора');
  if (terminal(t) || t.status === status) throw new Error('Выберите открытое обращение и новый статус');
  if (['Ожидает уточнения', 'Реализовано', 'Отклонено'].includes(status) && text.trim().length < 10) throw new Error('Укажите содержательное пояснение: минимум 10 символов');
  t.status = status;
  if (status === 'Реализовано') { t.changed = text.trim(); t.implementedAt = new Date().toISOString(); t.confirmed = false; }
  if (status === 'Отклонено') { t.rejection = text.trim(); t.closedAt = new Date().toISOString(); }
  event(t, actor, `Статус: ${status}${text.trim() ? '. ' + text.trim() : ''}`, status);
  if (text.trim()) t.comments.push({ id: crypto.randomUUID(), date: new Date().toISOString(), author: actor.name, text: text.trim() });
  persist(); return clone(t);
}
export async function addComment(id: string, text: string, userId: string) {
  await pause(); const t = ticket(id); const actor = user(userId); if (!canRead(actor, t)) throw new Error('Нет доступа'); if (!text.trim()) throw new Error('Введите комментарий');
  t.comments.push({ id: crypto.randomUUID(), date: new Date().toISOString(), author: actor.name, text: text.trim() });
  if (t.status === 'Ожидает уточнения' && t.authorId === userId) { t.status = 'На рассмотрении'; event(t, actor, 'Автор ответил на запрос уточнения', t.status); } else event(t, actor, 'Добавлен комментарий');
  persist(); return clone(t);
}
export async function reassign(id: string, assigneeId: string, reason: string, userId: string) {
  await pause(); const t = ticket(id); const actor = user(userId); assertManager(actor, t); const assignee = user(assigneeId);
  if (terminal(t)) throw new Error('Рассмотрение завершено'); if (assignee.role !== 'Руководитель' || assignee.vacation || assigneeId === t.assigneeId) throw new Error('Выберите другого доступного ответственного');
  if (reason.trim().length < 10) throw new Error('Укажите причину переназначения: минимум 10 символов');
  const previous = user(t.assigneeId).name; t.assigneeId = assigneeId; event(t, actor, `Переназначено: ${previous} → ${assignee.name}. Причина: ${reason.trim()}`); persist(); return clone(t);
}
export async function confirmResolution(id: string, solved: boolean, reason: string, userId: string) {
  await pause(); const t = ticket(id); const actor = user(userId); if (t.authorId !== actor.id || t.status !== 'Реализовано') throw new Error('Подтверждение доступно автору реализованного обращения');
  if (!solved && reason.trim().length < 10) throw new Error('Опишите, что осталось нерешённым: минимум 10 символов');
  t.confirmed = solved; t.status = solved ? 'Закрыто' : 'Возвращено автором'; t.closedAt = solved ? new Date().toISOString() : undefined;
  if (!solved) { t.dueAt = businessDays(new Date(), 5); t.comments.push({ id: crypto.randomUUID(), date: new Date().toISOString(), author: actor.name, text: reason.trim() }); }
  event(t, actor, solved ? 'Автор подтвердил: проблема решена' : `Автор вернул в работу: ${reason.trim()}`, t.status); persist(); return clone(t);
}
export async function findSimilar(text: string, userId: string) {
  await pause(); user(userId); if (text.trim().length < 8) return [];
  const words = text.toLowerCase().split(/[^а-яёa-z0-9]+/).filter(w => w.length > 3).map(w => w.slice(0, Math.max(4, w.length - 2)));
  return clone(db.tickets.filter(t => !terminal(t)).map(t => ({ t, score: words.filter(w => `${t.text} ${t.category}`.toLowerCase().includes(w)).length })).filter(x => x.score >= 2).sort((a, b) => b.score - a.score).slice(0, 4).map(x => x.t));
}
export async function joinTicket(id: string, context: string, frequency: Frequency, minutes: number, userId: string) {
  await pause(); const t = ticket(id); const actor = user(userId); if (actor.role !== 'Сотрудник') throw new Error('Присоединение доступно сотрудникам');
  if (terminal(t)) throw new Error('Обращение уже рассмотрено'); if (t.authorId === actor.id || t.participants.some(p => p.userId === actor.id)) throw new Error('Обращение уже есть в вашем списке');
  if (context.trim().length < 10) throw new Error('Добавьте свой контекст: минимум 10 символов');
  t.participants.push({ userId, department: actor.department, context: context.trim(), frequency, minutes }); event(t, actor, `Присоединился к обращению: ${context.trim()}`); persist(); return clone(t);
}
export async function suggestStructure(text: string): Promise<Structure> {
  await pause(); if (text.trim().length < 20) throw new Error('Для анализа нужно минимум 20 символов');
  const cluster = detectCluster(text); const categories: Record<string, string> = { purchase: 'Межотдельное взаимодействие', catalog: 'Каталог и данные', documents: 'Документооборот', decisions: 'Коммуникации', systems: 'Интеграции и IT', knowledge: 'Обучение' };
  const sentences = text.trim().split(/(?<=[.!?])\s+/); const solutions = sentences.filter(s => /предлага|нужн|можно|хотелось/i.test(s));
  return { problem: sentences.filter(s => !solutions.includes(s)).join(' ') || sentences[0], solution: solutions.join(' ') || 'Согласовать единый порядок работы и назначить владельца процесса.', effect: 'Сократить повторные уточнения и время передачи работы между подразделениями.', category: categories[cluster] || 'Корпоративная среда', priority: /сроч|срыв|теря|ошиб|повторн/i.test(text) ? 'Высокий' : 'Средний' };
}
export async function draftResponse(id: string, status: Status, userId: string) { await pause(); const t = ticket(id); assertManager(user(userId), t); return status === 'Ожидает уточнения' ? `Спасибо за обращение «${t.title}». Уточните, пожалуйста, на каком этапе возникает ситуация, как часто она повторяется и приложите обезличенный пример.` : status === 'Отклонено' ? 'Спасибо за предложение. Сейчас реализация ограничена доступными ресурсами. Предлагаем вернуться к оценке в следующем плановом периоде; уточним условия повторного рассмотрения.' : status === 'Реализовано' ? `По обращению «${t.title}» согласован единый порядок работы, назначен владелец процесса и опубликована памятка. Просим проверить результат в вашей работе.` : `Спасибо за обращение «${t.title}». Приняли в работу. Проверим описанную ситуацию и зафиксируем результат в этой карточке.`; }
export async function getImprovements() { await pause(); return clone(db.tickets.filter(t => !!t.implementedAt && !!t.changed && ['Реализовано', 'Закрыто'].includes(t.status)).sort((a, b) => (b.implementedAt || '').localeCompare(a.implementedAt || ''))); }
export async function getAnalytics(days: number, userId: string): Promise<Analytics> {
  await pause(); if (user(userId).role !== 'Руководитель') throw new Error('Аналитика доступна руководителю');
  const tickets = db.tickets.filter(t => !days || Date.now() - new Date(t.createdAt).getTime() <= days * 86400000);
  const hours = tickets.filter(t => t.firstResponseAt).map(t => (new Date(t.firstResponseAt!).getTime() - new Date(t.createdAt).getTime()) / 3600000).sort((a, b) => a - b);
  const percent = (n: number) => tickets.length ? n / tickets.length * 100 : 0;
  const inPeriod = (value?: string) => !!value && (!days || Date.now() - new Date(value).getTime() <= days * 86400000);
  const clusterTrends = Object.fromEntries(catalogBase.clusters.map(c => {
    const list = db.tickets.filter(t => t.clusterId === c.id);
    const recent = list.filter(t => Date.now() - new Date(t.createdAt).getTime() <= 30 * 86400000).length;
    const previous = list.filter(t => { const age = Date.now() - new Date(t.createdAt).getTime(); return age > 30 * 86400000 && age <= 60 * 86400000; }).length;
    return [c.id, recent - previous];
  }));
  return clone({ tickets, clusters: catalogBase.clusters, clusterTrends, departments: catalogBase.departments, users: db.users, considered: percent(tickets.filter(t => !!t.firstResponseAt).length), medianHours: hours.length ? (hours[Math.floor((hours.length - 1) / 2)] + hours[Math.floor(hours.length / 2)]) / 2 : 0, averageHours: hours.length ? hours.reduce((a, b) => a + b, 0) / hours.length : 0, resultRate: percent(tickets.filter(t => terminal(t) && (!!t.changed || !!t.rejection)).length), implemented: db.tickets.filter(t => ['Реализовано', 'Закрыто'].includes(t.status) && inPeriod(t.implementedAt)).length, confirmed: db.tickets.filter(t => t.confirmed && inPeriod(t.closedAt)).length });
}
export async function saveRule(rule: Rule, userId: string) { await pause(); if (user(userId).role !== 'Администратор') throw new Error('Нет доступа'); if (rule.primaryId === rule.backupId || rule.responseDays < 1 || rule.resolutionDays < rule.responseDays || !Number.isInteger(rule.responseDays) || !Number.isInteger(rule.resolutionDays)) throw new Error('Нужны разные ответственные и целые сроки: решение не раньше первого ответа'); if (db.rules.some(r => r.id !== rule.id && r.category === rule.category && r.department === rule.department)) throw new Error('Для этого подразделения правило уже существует'); db.rules = db.rules.map(r => r.id === rule.id ? clone(rule) : r); persist(); }
export async function setVacation(id: string, vacation: boolean, userId: string) { await pause(); if (user(userId).role !== 'Администратор') throw new Error('Нет доступа'); user(id).vacation = vacation; persist(); }
export async function resetDemo() { await pause(); db = createSeed(); persist(); }
