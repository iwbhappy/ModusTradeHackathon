import type { Rule, Ticket, User } from '../types';
import { addWorkingHours, workdaysAgo } from '../lib/business-time';
import { businessDays } from '../lib/format';
import type { SeedEntry } from './seed-entry';
import { seedHistory } from './seed-history';

export function buildSeedTicket(
  raw: SeedEntry,
  index: number,
  anchor: Date,
  users: User[],
  rules: Rule[],
): Ticket {
  const author = users.find((u) => u.id === raw.authorId)!;
  const rule = rules.find((r) => r.category === raw.category)!;
  const assignee = users.find((u) => u.id === (raw.assigneeId || rule.primaryId))!;
  const createdAt = workdaysAgo(anchor, raw.createdDaysAgo);
  const responseHours = raw.responseHours ?? [6, 10, 12, 16, 18][index % 5];
  const firstResponseAt =
    raw.status === 'Новое' ? undefined : addWorkingHours(new Date(createdAt), responseHours);
  const resolvedAt =
    raw.resolvedDaysAgo === undefined ? undefined : workdaysAgo(anchor, raw.resolvedDaysAgo, 15);
  const returned = raw.status === 'Возвращено автором';
  const realized =
    raw.status === 'Реализовано' ||
    returned ||
    (raw.status === 'Закрыто' && raw.type !== 'Положительный отзыв');
  const closedAt = ['Закрыто', 'Отклонено'].includes(raw.status)
    ? addWorkingHours(new Date(resolvedAt!), 1)
    : undefined;
  const returnAt = returned ? addWorkingHours(new Date(resolvedAt!), 1) : undefined;
  const responseDueAt = businessDays(new Date(createdAt), rule.responseDays);
  const dueAt = returnAt
    ? businessDays(new Date(returnAt), 5)
    : businessDays(new Date(createdAt), rule.resolutionDays);
  const type = raw.type || 'Проблема';
  const ticket: Ticket = {
    id: raw.id,
    title: raw.title,
    text: raw.text,
    type,
    category: raw.category,
    authorId: author.id,
    authorDepartment: author.department,
    targetDepartment: raw.targetDepartment,
    assigneeId: assignee.id,
    priority: raw.priority || 'Средний',
    status: raw.status,
    createdAt,
    responseDueAt,
    dueAt,
    firstResponseAt,
    implementedAt: realized ? resolvedAt : undefined,
    closedAt,
    events: [],
    comments: [],
    participants: [],
    frequency: raw.frequency || (index % 3 === 0 ? 'ежедневно' : 'еженедельно'),
    minutes: raw.minutes || [15, 30, 60, 120][index % 4],
    solution: '',
    effect: '',
    changed: raw.changed || '',
    rejection: raw.rejection || '',
    confirmed: raw.status === 'Закрыто' && realized,
    attachments: [],
    clusterId: raw.clusterId,
  };
  if (raw.id.startsWith('A-') && type === 'Проблема') {
    const employees = users.filter((u) => u.role === 'Сотрудник' && u.id !== author.id);
    ticket.participants = employees.slice(index % 4, (index % 4) + 1 + (index % 4)).map((u) => ({
      userId: u.id,
      department: u.department,
      context: 'Встречаемся с аналогичной ситуацией при передаче данных между подразделениями.',
      frequency: 'еженедельно',
      minutes: 30,
    }));
  }
  const history = seedHistory(ticket, raw, author, assignee, anchor, returnAt);
  ticket.events = history.events;
  ticket.comments = history.comments;
  return ticket;
}
