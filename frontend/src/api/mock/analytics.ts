import { catalogBase } from '../../data/seed';
import { cost, overdue, terminal } from '../../lib/format';
import { workingHoursBetween } from '../../lib/business-time';
import type { Analytics, AnalyticsFilters, Ticket } from '../../types';
import { db, pause, clone, user, canRead } from './storage';

function cohort(days: number, userId: string): Ticket[] {
  const actor = user(userId);
  if (actor.role !== 'Руководитель') throw new Error('Аналитика доступна руководителю');
  return db.tickets.filter(
    (ticket) =>
      (actor.canViewCompanyAnalytics || canRead(actor, ticket)) &&
      (!days || Date.now() - Date.parse(ticket.createdAt) <= days * 86400000),
  );
}

export async function getAnalytics(days: number, userId: string): Promise<Analytics> {
  await pause();
  const tickets = cohort(days, userId);
  const groups = (key: 'type' | 'status' | 'category') =>
    [...new Set(tickets.map((t) => t[key]))]
      .map((label) => ({ label, value: tickets.filter((t) => t[key] === label).length }))
      .sort((a, b) => b.value - a.value);
  const hours = tickets
    .filter((t) => t.firstResponseAt)
    .map((t) => workingHoursBetween(t.createdAt, t.firstResponseAt!))
    .sort((a, b) => a - b);
  const percent = (n: number) => (tickets.length ? (n / tickets.length) * 100 : 0);
  const clusterStats = catalogBase.clusters.map((cluster) => {
    const list = tickets.filter((t) => t.clusterId === cluster.id);
    const history = cohort(0, userId).filter((t) => t.clusterId === cluster.id);
    const recent = history.filter(
      (t) => Date.now() - Date.parse(t.createdAt) <= 30 * 86400000,
    ).length;
    const previous = history.filter((t) => {
      const age = Date.now() - Date.parse(t.createdAt);
      return age > 30 * 86400000 && age <= 60 * 86400000;
    }).length;
    return {
      id: cluster.id,
      title: cluster.title,
      count: list.length,
      monthlyCost: list.reduce((sum, t) => sum + cost(t), 0),
      departments: [
        ...new Set(
          list.flatMap((t) => [
            t.authorDepartment,
            t.targetDepartment,
            ...t.participants.map((p) => p.department),
          ]),
        ),
      ],
      trend: recent - previous,
    };
  });
  const monday = new Date();
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  const weekly = Array.from({ length: 10 }, (_, index) => {
    const start = new Date(+monday - (9 - index) * 7 * 86400000);
    const end = +start + 7 * 86400000;
    return {
      start: start.toISOString(),
      incoming: tickets.filter(
        (t) => Date.parse(t.createdAt) >= +start && Date.parse(t.createdAt) < end,
      ).length,
      done: tickets.filter(
        (t) =>
          t.implementedAt &&
          Date.parse(t.implementedAt) >= +start &&
          Date.parse(t.implementedAt) < end &&
          ['Реализовано', 'Закрыто'].includes(t.status),
      ).length,
    };
  });
  return clone({
    total: tickets.length,
    openCount: tickets.filter((t) => !terminal(t)).length,
    overdueCount: tickets.filter(overdue).length,
    companyScope: !!user(userId).canViewCompanyAnalytics,
    considered: percent(hours.length),
    medianHours: hours.length
      ? (hours[Math.floor((hours.length - 1) / 2)] + hours[Math.floor(hours.length / 2)]) / 2
      : 0,
    averageHours: hours.length ? hours.reduce((sum, value) => sum + value, 0) / hours.length : 0,
    resultRate: percent(
      tickets.filter((t) => terminal(t) && (!!t.changed || !!t.rejection)).length,
    ),
    implemented: tickets.filter(
      (t) => t.implementedAt && ['Реализовано', 'Закрыто'].includes(t.status),
    ).length,
    confirmed: tickets.filter((t) => t.confirmed).length,
    defaultConfirmed: tickets.filter((t) => t.defaultConfirmed).length,
    distributions: { type: groups('type'), status: groups('status'), category: groups('category') },
    clusterStats,
    departments: catalogBase.departments,
    weekly,
    matrix: catalogBase.departments.flatMap((authorDepartment) =>
      catalogBase.departments.map((targetDepartment) => ({
        authorDepartment,
        targetDepartment,
        count: tickets.filter(
          (t) =>
            t.type === 'Проблема' &&
            t.authorDepartment === authorDepartment &&
            t.targetDepartment === targetDepartment,
        ).length,
      })),
    ),
    sla: catalogBase.departments.map((department) => ({
      department,
      count: tickets.filter((t) => overdue(t) && user(t.assigneeId).department === department)
        .length,
    })),
  });
}

export async function getAnalyticsTickets(days: number, filters: AnalyticsFilters, userId: string) {
  await pause();
  return clone(
    cohort(days, userId).filter(
      (t) =>
        (!filters.cluster || t.clusterId === filters.cluster) &&
        (!filters.type || t.type === filters.type) &&
        (!filters.authorDepartment || t.authorDepartment === filters.authorDepartment) &&
        (!filters.targetDepartment || t.targetDepartment === filters.targetDepartment) &&
        (!filters.assigneeDepartment ||
          user(t.assigneeId).department === filters.assigneeDepartment) &&
        (!filters.overdue || overdue(t)),
    ),
  );
}
