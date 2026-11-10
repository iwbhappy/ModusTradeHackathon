import { detectCluster } from '../../data/seed';
import { businessDays, overdue, terminal } from '../../lib/format';
import type { Frequency, Status, Ticket, TicketDraft, TicketFilters } from '../../types';
import { db, pause, clone, user, ticket, canRead, assertManager, event, persist } from './storage';
import { route } from './routing';
import { makeTitle } from '../../lib/title';
import { attachmentMetadata } from './extras';
function filterTickets(tickets: Ticket[], f: TicketFilters) {
  return tickets.filter(
    (t) =>
      (!f.search ||
        `${t.id} ${t.title} ${t.text}`.toLowerCase().includes(f.search.toLowerCase())) &&
      (!f.department || t.targetDepartment === f.department) &&
      (!f.category || t.category === f.category) &&
      (!f.status || t.status === f.status) &&
      (!f.priority || t.priority === f.priority) &&
      (!f.overdue || overdue(t)) &&
      (!f.cluster || t.clusterId === f.cluster) &&
      (!f.authorDepartment || t.authorDepartment === f.authorDepartment) &&
      (!f.targetDepartment || t.targetDepartment === f.targetDepartment),
  );
}

export async function listTickets(userId: string, filters: TicketFilters = {}): Promise<Ticket[]> {
  await pause();
  return clone(
    filterTickets(
      db.tickets.filter((t) => canRead(user(userId), t)),
      filters,
    ).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  );
}
export async function getTicket(id: string, userId: string): Promise<Ticket> {
  await pause();
  const t = ticket(id);
  if (!canRead(user(userId), t))
    throw new Error(
      'Обращение недоступно для выбранного пользователя. Выберите автора или ответственного.',
    );
  return clone(t);
}
export async function createTicket(draft: TicketDraft, userId: string) {
  await pause();
  const author = user(userId);
  if (author.role !== 'Сотрудник') throw new Error('Подача доступна в роли сотрудника');
  if (draft.text.trim().length < 20) throw new Error('Опишите ситуацию: минимум 20 символов');
  if (draft.title.trim().length > 80) throw new Error('Краткий заголовок: не более 80 символов');
  const routing = route(draft.category, draft.targetDepartment);
  const now = new Date().toISOString();
  const t: Ticket = {
    ...clone(draft),
    id: `N-${String(db.tickets.filter((t) => t.id.startsWith('N-')).length + 1).padStart(3, '0')}`,
    text: draft.text.trim(),
    title: makeTitle(draft.text, draft.title),
    attachmentFiles: attachmentMetadata(draft.attachmentIds || []),
    authorId: userId,
    authorDepartment: author.department,
    assigneeId: routing.assignee.id,
    status: 'Новое',
    createdAt: now,
    responseDueAt: routing.responseDueAt,
    dueAt: routing.dueAt,
    events: [],
    comments: [],
    participants: [],
    changed: '',
    rejection: '',
    confirmed: false,
    clusterId: detectCluster(draft.text),
  };
  event(
    t,
    author,
    `Зарегистрировано. Назначен: ${routing.assignee.name}` +
      (routing.fallback ? ' (резервный: основной в отпуске)' : '') +
      `. Первый ответ до ${new Date(routing.responseDueAt).toLocaleDateString('ru-RU')}`,
    'Новое',
  );
  db.tickets.push(t);
  persist();
  return clone(t);
}
export async function updateStatus(id: string, status: Status, text: string, userId: string) {
  await pause();
  const t = ticket(id);
  const actor = user(userId);
  assertManager(actor, t);
  if (
    !['На рассмотрении', 'В работе', 'Ожидает уточнения', 'Реализовано', 'Отклонено'].includes(
      status,
    )
  )
    throw new Error('Этот статус устанавливается отдельным действием автора');
  if (terminal(t) || t.status === status)
    throw new Error('Выберите открытое обращение и новый статус');
  if (['Ожидает уточнения', 'Реализовано', 'Отклонено'].includes(status) && text.trim().length < 10)
    throw new Error('Укажите содержательное пояснение: минимум 10 символов');
  t.status = status;
  if (status === 'Реализовано') {
    t.changed = text.trim();
    t.implementedAt = new Date().toISOString();
    t.confirmed = false;
  }
  if (status === 'Отклонено') {
    t.rejection = text.trim();
    t.closedAt = new Date().toISOString();
  }
  event(t, actor, `Статус: ${status}${text.trim() ? '. ' + text.trim() : ''}`, status);
  if (text.trim())
    t.comments.push({
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      author: actor.name,
      text: text.trim(),
    });
  persist();
  return clone(t);
}
export async function addComment(id: string, text: string, userId: string) {
  await pause();
  const t = ticket(id);
  const actor = user(userId);
  if (!canRead(actor, t)) throw new Error('Нет доступа');
  if (!text.trim()) throw new Error('Введите комментарий');
  t.comments.push({
    id: crypto.randomUUID(),
    date: new Date().toISOString(),
    author: actor.name,
    text: text.trim(),
  });
  if (t.status === 'Ожидает уточнения' && t.authorId === userId) {
    t.status = 'На рассмотрении';
    event(t, actor, 'Автор ответил на запрос уточнения', t.status);
  } else event(t, actor, 'Добавлен комментарий');
  persist();
  return clone(t);
}
export async function reassign(id: string, assigneeId: string, reason: string, userId: string) {
  await pause();
  const t = ticket(id);
  const actor = user(userId);
  assertManager(actor, t);
  const assignee = user(assigneeId);
  if (terminal(t)) throw new Error('Рассмотрение завершено');
  if (assignee.role !== 'Руководитель' || assignee.vacation || assigneeId === t.assigneeId)
    throw new Error('Выберите другого доступного ответственного');
  if (reason.trim().length < 10)
    throw new Error('Укажите причину переназначения: минимум 10 символов');
  const previous = user(t.assigneeId).name;
  t.assigneeId = assigneeId;
  event(t, actor, `Переназначено: ${previous} → ${assignee.name}. Причина: ${reason.trim()}`);
  persist();
  return clone(t);
}
export async function confirmResolution(
  id: string,
  solved: boolean,
  reason: string,
  userId: string,
) {
  await pause();
  const t = ticket(id);
  const actor = user(userId);
  if (t.authorId !== actor.id || t.status !== 'Реализовано')
    throw new Error('Подтверждение доступно автору реализованного обращения');
  if (!solved && reason.trim().length < 10)
    throw new Error('Опишите, что осталось нерешённым: минимум 10 символов');
  t.confirmed = solved;
  t.status = solved ? 'Закрыто' : 'Возвращено автором';
  t.closedAt = solved ? new Date().toISOString() : undefined;
  if (!solved) {
    t.dueAt = businessDays(new Date(), 5);
    t.comments.push({
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      author: actor.name,
      text: reason.trim(),
    });
  }
  event(
    t,
    actor,
    solved ? 'Автор подтвердил: проблема решена' : `Автор вернул в работу: ${reason.trim()}`,
    t.status,
  );
  persist();
  return clone(t);
}
export async function joinTicket(
  id: string,
  context: string,
  frequency: Frequency,
  minutes: number,
  userId: string,
) {
  await pause();
  const t = ticket(id);
  const actor = user(userId);
  if (actor.role !== 'Сотрудник') throw new Error('Присоединение доступно сотрудникам');
  if (terminal(t)) throw new Error('Обращение уже рассмотрено');
  if (t.authorId === actor.id || t.participants.some((p) => p.userId === actor.id))
    throw new Error('Обращение уже есть в вашем списке');
  if (context.trim().length < 10) throw new Error('Добавьте свой контекст: минимум 10 символов');
  t.participants.push({
    userId,
    department: actor.department,
    context: context.trim(),
    frequency,
    minutes,
  });
  event(t, actor, `Присоединился к обращению: ${context.trim()}`);
  persist();
  return clone(t);
}
export async function getImprovements() {
  await pause();
  return clone(
    db.tickets
      .filter(
        (t) => !!t.implementedAt && !!t.changed && ['Реализовано', 'Закрыто'].includes(t.status),
      )
      .sort((a, b) => (b.implementedAt || '').localeCompare(a.implementedAt || '')),
  );
}
