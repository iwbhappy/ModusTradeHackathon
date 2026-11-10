import type { PeriodReport, PeriodSummary } from '../../types';
import { buildPeriodReport, inWindow, periodBounds, reportItem } from '../../lib/period-data';
import { cost } from '../../lib/format';
import { cohort } from './analytics';
import { db, user, pause, clone, getCatalog } from './storage';
import { scoreSimilar } from './search-scoring';

export async function getPeriodReport(
  from: string,
  to: string,
  userId: string,
): Promise<PeriodReport> {
  await pause();
  const tickets = cohort(0, userId),
    actor = user(userId);
  const catalog = await getCatalog();
  const [start, end] = periodBounds(from, to);
  const candidates = tickets.filter(
    (t) => !t.clusterId && t.type === 'Проблема' && t.status !== 'Отклонено',
  );
  const visited = new Set<string>(),
    newTopics: PeriodReport['newTopics'] = [];
  for (const seed of candidates) {
    if (visited.has(seed.id)) continue;
    const group = [seed];
    visited.add(seed.id);
    for (let index = 0; index < group.length; index++) {
      for (const match of scoreSimilar(candidates, group[index].text, {}).filter(
        (m) => m.matches >= 2,
      )) {
        if (!visited.has(match.ticket.id)) {
          visited.add(match.ticket.id);
          group.push(match.ticket);
        }
      }
    }
    group.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const items = group.filter((t) => Date.parse(t.createdAt) < end);
    if (items.length >= 2 && inWindow(group[0].createdAt, start, end))
      newTopics.push({
        title: group[0].title,
        firstSeen: group[0].createdAt,
        departments: [...new Set(items.flatMap((t) => [t.authorDepartment, t.targetDepartment]))],
        monthlyCost: items.reduce((sum, t) => sum + cost(t), 0),
        tickets: items.map((t) => reportItem(t, actor, db.users)),
      });
  }
  return clone(buildPeriodReport(tickets, catalog, actor, from, to, newTopics));
}

export async function summarizePeriod(
  from: string,
  to: string,
  userId: string,
): Promise<PeriodSummary> {
  const report = await getPeriodReport(from, to, userId);
  return {
    report,
    source: 'rules',
    cached: false,
    notice: 'Статическая версия: автоподсказка по правилам.',
    summaries: Object.fromEntries(report.groups.map((g) => [g.id, g.brief])),
  };
}
