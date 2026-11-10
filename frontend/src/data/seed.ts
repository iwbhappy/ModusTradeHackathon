import originals from './originals.json';
import type { Database, Priority, Status, TicketType } from '../types';
import { demoAnchor } from '../lib/business-time';
import { detectCluster } from './catalog';
import { originalTitles } from './original-titles';
import { createUsersAndRules } from './users';
import { buildSeedTicket } from './seed-ticket';
import type { SeedEntry } from './seed-entry';
import { procurementTickets } from './synthetic/procurement';
import { projectTickets } from './synthetic/projects';
import { serviceTickets } from './synthetic/service';
import { operationsTickets } from './synthetic/operations';

export { catalogBase, detectCluster } from './catalog';

// Enrichment only: every original business field comes directly from originals.json.
const originalSchedule: [number, number?][] = [
  [1],
  [4],
  [3],
  [35, 18],
  [3],
  [4],
  [12],
  [24, 12],
  [3],
  [2],
  [2],
  [3],
  [12],
  [4],
  [5],
  [1],
  [14, 6],
  [20, 10],
  [6],
  [0],
];

export function createSeed(): Database {
  const { users, rules } = createUsersAndRules();
  const anchor = demoAnchor();
  const originalEntries: SeedEntry[] = originals.map((raw, i) => {
    const author = users.find((u) => u.name === raw.author)!;
    const assignee = users.find((u) => u.name === raw.assignee)!;
    return {
      id: raw.id,
      title: originalTitles[i],
      text: raw.text,
      type: raw.type as TicketType,
      category: raw.category,
      authorId: author.id,
      assigneeId: assignee.id,
      targetDepartment: assignee.department,
      priority: raw.priority as Priority,
      status: raw.status as Status,
      clusterId: detectCluster(`${raw.text} ${raw.category}`),
      createdDaysAgo: originalSchedule[i][0],
      resolvedDaysAgo: originalSchedule[i][1],
      changed: originalResult(raw.id),
      rejection:
        raw.id === 'A-017'
          ? 'Сейчас нет подходящего помещения. Вернёмся к вопросу при перепланировке рабочих помещений.'
          : '',
      comments: originalComments(raw.id),
    };
  });
  const entries = [
    ...originalEntries,
    ...procurementTickets,
    ...projectTickets,
    ...serviceTickets,
    ...operationsTickets,
  ];
  const tickets = entries.map((entry, index) =>
    buildSeedTicket(entry, index, anchor, users, rules),
  );
  return { version: 2, users, rules, tickets };
}

function originalResult(id: string): string {
  if (id === 'A-004') {
    return 'Запланирован пробный обучающий семинар; опубликован календарь встреч.';
  }
  if (id === 'A-008') {
    return 'Создана учебная инструкция с типовыми ошибками и контактами наставников.';
  }
  if (id === 'A-018') {
    return 'Положительный отзыв передан организаторам. Формат учебных встреч сохранён.';
  }
  return '';
}

function originalComments(id: string): string[] {
  if (id === 'A-005') {
    return [
      'Уточните, пожалуйста, виды документов и ключевые этапы согласования. Приложите обезличенный пример.',
    ];
  }
  if (id === 'A-013') {
    return ['Уточните формат исходных файлов и приведите пример изменения спецификации.'];
  }
  return [];
}
