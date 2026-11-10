import type {
  Catalog,
  MetricKey,
  MetricValue,
  PeriodReport,
  ReportGroup,
  ReportTicket,
  Ticket,
  User,
} from '../types';
import { businessDays, cost, terminal } from './format';
import { canRead } from './permissions';

export const DAY = 86400000;
export const businessDate = (value = new Date()) =>
  new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Moscow' }).format(value);
export const periodBounds = (from: string, to: string) => [
  Date.parse(`${from}T00:00:00+03:00`),
  Date.parse(`${to}T00:00:00+03:00`) + DAY,
];
export const inWindow = (value: string | undefined, start: number, end: number) =>
  !!value && Date.parse(value) >= start && Date.parse(value) < end;
export function activity(t: Ticket, start: number, end: number, users: User[]) {
  const reached = (status: string) =>
    t.events.some((event) => event.status === status && inWindow(event.date, start, end));
  const implemented = inWindow(t.implementedAt, start, end) || reached('Реализовано');
  const rejected =
    !!t.rejection &&
    ((t.status === 'Отклонено' && inWindow(t.closedAt, start, end)) || reached('Отклонено'));
  return {
    incoming: inWindow(t.createdAt, start, end),
    implemented,
    rejected,
    resolved: implemented || rejected,
    confirmed:
      (!!t.confirmed && inWindow(t.closedAt, start, end)) ||
      t.events.some(
        (event) =>
          event.status === 'Закрыто' &&
          event.actor === users.find((u) => u.id === t.authorId)?.name &&
          inWindow(event.date, start, end),
      ),
    closed: (t.status === 'Закрыто' && inWindow(t.closedAt, start, end)) || reached('Закрыто'),
  };
}
export function periodStats(tickets: Ticket[], start: number, end: number, users: User[]) {
  const values: Record<MetricKey, number> = {
    incoming: 0,
    resolved: 0,
    confirmed: 0,
    savedHours: 0,
  };
  for (const ticket of tickets) {
    const flags = activity(ticket, start, end, users);
    for (const key of ['incoming', 'resolved', 'confirmed'] as const)
      values[key] += Number(flags[key]);
    if (flags.implemented) values.savedHours += cost(ticket);
  }
  values.savedHours = Math.round(values.savedHours * 10) / 10;
  return values;
}
export function comparison(
  current: Record<MetricKey, number>,
  previous: Record<MetricKey, number>,
) {
  return Object.fromEntries(
    Object.entries(current).map(([key, value]) => {
      const before = previous[key as MetricKey];
      return [
        key,
        {
          value,
          previous: before,
          delta: Math.round((value - before) * 10) / 10,
          percent: before ? Math.round(((value - before) / before) * 1000) / 10 : null,
        },
      ];
    }),
  ) as Record<MetricKey, MetricValue>;
}
export function stageMatch(t: Ticket, stage: string) {
  const implemented = !!t.implementedAt || t.events.some((event) => event.status === 'Реализовано');
  const work =
    implemented ||
    ['В работе', 'Возвращено автором'].includes(t.status) ||
    t.events.some((event) => event.status === 'В работе');
  return (
    {
      incoming: true,
      considered: work || !!t.firstResponseAt || t.status !== 'Новое',
      work,
      implemented,
      confirmed: implemented && t.confirmed,
    }[stage] || false
  );
}
export function healthMatch(t: Ticket, health: string) {
  if (terminal(t)) return false;
  const now = Date.now(),
    due = Date.parse(t.dueAt),
    soon = Date.parse(businessDays(new Date(now), 3));
  return (
    { onTime: due > soon, soon: due >= now && due <= soon, overdue: due < now }[health] || false
  );
}
export function reportItem(t: Ticket, actor: User, users: User[]): ReportTicket {
  return {
    id: t.id,
    title: t.title,
    status: t.status,
    changed: t.changed,
    rejection: t.rejection,
    assigneeId: t.assigneeId,
    monthlyCost: cost(t),
    canRead: canRead(actor, t, users),
  };
}
export function buildPeriodReport(
  tickets: Ticket[],
  catalog: Catalog,
  actor: User,
  from: string,
  to: string,
  topics: PeriodReport['newTopics'] = [],
): PeriodReport {
  const [start, end] = periodBounds(from, to);
  if (!Number.isFinite(start + end) || start >= end)
    throw new Error('Начало периода должно быть не позже окончания');
  const groups = new Map<string, ReportGroup>();
  for (const t of tickets) {
    const flags = activity(t, start, end, catalog.users);
    if (
      !Object.values(flags).some(Boolean) &&
      !t.events.some((e) => e.status && inWindow(e.date, start, end))
    )
      continue;
    const id = t.clusterId ? `cluster:${t.clusterId}` : `category:${t.category}`;
    if (!groups.has(id))
      groups.set(id, {
        id,
        title: catalog.clusters.find((c) => c.id === t.clusterId)?.title || t.category,
        departments: [],
        counts: { incoming: 0, implemented: 0, rejected: 0, closed: 0, working: 0 },
        monthlyCost: 0,
        brief: '',
        tickets: [],
      });
    const group = groups.get(id)!;
    for (const key of ['incoming', 'implemented', 'rejected', 'closed'] as const)
      group.counts[key] += Number(flags[key]);
    group.counts.working += Number(['В работе', 'Возвращено автором'].includes(t.status));
    group.monthlyCost += cost(t);
    group.departments = [
      ...new Set([
        ...group.departments,
        t.authorDepartment,
        t.targetDepartment,
        ...t.participants.map((p) => p.department),
      ]),
    ].sort();
    group.tickets.push({
      ...reportItem(t, actor, catalog.users),
      activity: {
        incoming: Number(flags.incoming),
        implemented: Number(flags.implemented),
        rejected: Number(flags.rejected),
        closed: Number(flags.closed),
      },
    });
  }
  for (const group of groups.values()) {
    const count = group.counts.implemented;
    const ending =
      count % 100 >= 11 && count % 100 <= 14
        ? 'изменений'
        : count % 10 === 1
          ? 'изменение'
          : [2, 3, 4].includes(count % 10)
            ? 'изменения'
            : 'изменений';
    const sentences = group.tickets
      .filter((t) => t.activity?.implemented && t.changed)
      .slice(0, 2)
      .map((t) => t.changed.trim().split(/(?<=[.!?])\s+/)[0]);
    group.brief = `Реализовано ${count} ${ending}${sentences.length ? ': ' + sentences.join(' ') : '; мотивированных отказов — ' + group.counts.rejected}. Ещё ${group.counts.working} в работе; новых — ${group.counts.incoming}.`;
  }
  const attention: PeriodReport['attention'] = [];
  const add = (id: string, label: string, items: Ticket[]) => {
    if (items.length)
      attention.push({
        id,
        label,
        count: items.length,
        tickets: items.map((t) => reportItem(t, actor, catalog.users)),
      });
  };
  add(
    'escalated',
    'Эскалировано',
    tickets.filter((t) => !terminal(t) && t.escalated),
  );
  add(
    'overdue',
    'Просрочено',
    tickets.filter((t) => !terminal(t) && Date.parse(t.dueAt) < Date.now()),
  );
  add(
    'returned',
    'Возвращено авторами',
    tickets.filter((t) => t.status === 'Возвращено автором'),
  );
  add(
    'awaiting',
    'Ждут ответа автора дольше 3 дней',
    tickets.filter((t) => {
      const since =
        t.status === 'Реализовано'
          ? t.implementedAt
          : t.status === 'Ожидает уточнения'
            ? [...t.events].reverse().find((e) => e.status === t.status)?.date || t.createdAt
            : undefined;
      return since && Date.parse(since) < Date.now() - 3 * DAY;
    }),
  );
  if (topics.length)
    attention.push({
      id: 'emerging',
      label: 'Новые зарождающиеся проблемы',
      count: topics.length,
      tickets: [...new Map(topics.flatMap((t) => t.tickets).map((t) => [t.id, t])).values()],
    });
  return {
    from,
    to,
    previousFrom: businessDate(new Date(start - (end - start))),
    previousTo: businessDate(new Date(start - DAY)),
    companyScope: actor.role === 'Администратор' || !!actor.canViewCompanyAnalytics,
    metrics: comparison(
      periodStats(tickets, start, end, catalog.users),
      periodStats(tickets, start - (end - start), start, catalog.users),
    ),
    attention,
    attentionAsOf: new Date().toISOString(),
    groups: [...groups.values()].sort(
      (a, b) =>
        Number(!!b.counts.implemented) - Number(!!a.counts.implemented) ||
        b.monthlyCost - a.monthlyCost ||
        a.id.localeCompare(b.id),
    ),
    newTopics: topics,
  };
}
