import type { Comment, Event, Ticket, User } from '../types';
import { addWorkingHours, workdaysAgo } from '../lib/business-time';
import type { SeedEntry } from './seed-entry';

export function seedHistory(
  ticket: Ticket,
  raw: SeedEntry,
  author: User,
  assignee: User,
  anchor: Date,
  returnAt?: string,
): { events: Event[]; comments: Comment[] } {
  const events: Event[] = [
    {
      id: `${raw.id}-created`,
      date: ticket.createdAt,
      actor: author.name,
      text: 'Обращение зарегистрировано',
      status: 'Новое',
    },
  ];
  const firstResponseAt = ticket.firstResponseAt;
  if (firstResponseAt) {
    events.push({
      id: `${raw.id}-response`,
      date: firstResponseAt,
      actor: assignee.name,
      text: 'Обращение принято на рассмотрение',
      status: 'На рассмотрении',
    });
    if (!['Новое', 'На рассмотрении', 'Ожидает уточнения', 'Отклонено'].includes(raw.status)) {
      events.push({
        id: `${raw.id}-work`,
        date: addWorkingHours(new Date(firstResponseAt), 1),
        actor: assignee.name,
        text: 'Начата работа по обращению',
        status: 'В работе',
      });
    }
  }
  if (ticket.implementedAt) {
    events.push({
      id: `${raw.id}-result`,
      date: ticket.implementedAt,
      actor: assignee.name,
      text: ticket.changed,
      status: 'Реализовано',
    });
  }
  if (ticket.closedAt) {
    events.push({
      id: `${raw.id}-closed`,
      date: ticket.closedAt,
      actor: ticket.confirmed ? author.name : assignee.name,
      text:
        ticket.rejection ||
        (ticket.confirmed ? 'Автор подтвердил: проблема решена' : ticket.changed),
      status: raw.status,
    });
  }
  const commentTexts = raw.comments || [];
  const comments: Comment[] = commentTexts.map((text, i) => ({
    id: `${raw.id}-comment-${i}`,
    date:
      i === 0 && firstResponseAt
        ? addWorkingHours(new Date(firstResponseAt), 1)
        : returnAt || ticket.closedAt || ticket.implementedAt || workdaysAgo(anchor, 0, 16),
    author: i % 2 === 0 ? assignee.name : author.name,
    text,
  }));
  for (const [index, comment] of comments.entries()) {
    if (returnAt && index === comments.length - 1) continue;
    events.push({
      id: comment.id,
      date: comment.date,
      actor: comment.author,
      text: comment.text,
      status: raw.status === 'Ожидает уточнения' && index === 0 ? 'Ожидает уточнения' : undefined,
    });
  }
  if (returnAt) {
    events.push({
      id: `${raw.id}-return`,
      date: returnAt,
      actor: author.name,
      text: commentTexts.at(-1) || 'Автор вернул обращение на доработку',
      status: 'Возвращено автором',
    });
  }
  events.sort((a, b) => a.date.localeCompare(b.date));
  return { events, comments };
}
