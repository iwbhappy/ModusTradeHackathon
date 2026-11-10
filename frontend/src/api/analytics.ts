import { catalogBase } from '../data/seed';
import { terminal } from '../lib/format';
import { workingHoursBetween } from '../lib/business-time';
import type { Analytics } from '../types';
import { db, pause, clone, user } from './storage';

export async function getAnalytics(days: number, userId: string): Promise<Analytics> {
  await pause();
  if (user(userId).role !== 'Руководитель') throw new Error('Аналитика доступна руководителю');
  const tickets = db.tickets.filter(
    (t) => !days || Date.now() - new Date(t.createdAt).getTime() <= days * 86400000,
  );
  const hours = tickets
    .filter((t) => t.firstResponseAt)
    .map((t) => workingHoursBetween(t.createdAt, t.firstResponseAt!))
    .sort((a, b) => a - b);
  const percent = (n: number) => (tickets.length ? (n / tickets.length) * 100 : 0);
  const inPeriod = (value?: string) =>
    !!value && (!days || Date.now() - new Date(value).getTime() <= days * 86400000);
  const clusterTrends = Object.fromEntries(
    catalogBase.clusters.map((c) => {
      const list = db.tickets.filter((t) => t.clusterId === c.id);
      const recent = list.filter(
        (t) => Date.now() - new Date(t.createdAt).getTime() <= 30 * 86400000,
      ).length;
      const previous = list.filter((t) => {
        const age = Date.now() - new Date(t.createdAt).getTime();
        return age > 30 * 86400000 && age <= 60 * 86400000;
      }).length;
      return [c.id, recent - previous];
    }),
  );
  return clone({
    tickets,
    clusters: catalogBase.clusters,
    clusterTrends,
    departments: catalogBase.departments,
    users: db.users,
    considered: percent(tickets.filter((t) => !!t.firstResponseAt).length),
    medianHours: hours.length
      ? (hours[Math.floor((hours.length - 1) / 2)] + hours[Math.floor(hours.length / 2)]) / 2
      : 0,
    averageHours: hours.length ? hours.reduce((a, b) => a + b, 0) / hours.length : 0,
    resultRate: percent(
      tickets.filter((t) => terminal(t) && (!!t.changed || !!t.rejection)).length,
    ),
    implemented: db.tickets.filter(
      (t) => ['Реализовано', 'Закрыто'].includes(t.status) && inPeriod(t.implementedAt),
    ).length,
    confirmed: db.tickets.filter((t) => t.confirmed && inPeriod(t.closedAt)).length,
  });
}
