import { categoryAliases, detectCluster } from '../../data/seed';
import { terminal } from '../../lib/format';
import { makeTitle } from '../../lib/title';
import type {
  AiStatus,
  EmergingGroup,
  SimilarityContext,
  SimilarTicket,
  Status,
  Structure,
} from '../../types';
import { db, pause, clone, user, ticket, assertManager } from './storage';
import { scoreSimilar } from './search-scoring';

export async function findSimilar(
  text: string,
  userId: string,
  context: SimilarityContext = {},
): Promise<SimilarTicket[]> {
  await pause();
  user(userId);
  if (text.trim().length < 8) return [];
  return clone(
    scoreSimilar(db.tickets, text, context)
      .filter((item) => !terminal(item.ticket) && item.matches >= 2)
      .sort((a, b) => b.score - a.score || a.ticket.id.localeCompare(b.ticket.id))
      .slice(0, 4)
      .map((item) => ({
        ...item.ticket,
        matchExplanation: item.explanation,
        outcome: 'open' as const,
        outcomeText: '',
      })),
  );
}
export async function suggestStructure(text: string): Promise<Structure> {
  await pause();
  if (text.trim().length < 20) throw new Error('Для анализа нужно минимум 20 символов');
  const cluster = detectCluster(text);
  const categories: Record<string, string> = {
    purchase: 'Межотдельное взаимодействие',
    catalog: 'Каталог и данные',
    documents: 'Документооборот',
    decisions: 'Коммуникации',
    systems: 'Интеграции и IT',
    knowledge: 'Обучение',
  };
  const sentences = text.trim().split(/(?<=[.!?])\s+/);
  const solutions = sentences.filter((s) => /предлага|нужн|можно|хотелось/i.test(s));
  return {
    title: makeTitle(text),
    problem: sentences.filter((s) => !solutions.includes(s)).join(' ') || sentences[0],
    solution:
      solutions.join(' ') || 'Согласовать единый порядок работы и назначить владельца процесса.',
    effect: 'Сократить повторные уточнения и время передачи работы между подразделениями.',
    category: categoryAliases[categories[cluster]] || 'Корпоративная среда',
    priority: /сроч|срыв|теря|ошиб|повторн/i.test(text) ? 'Высокий' : 'Средний',
  };
}
export async function draftResponse(id: string, status: Status, userId: string) {
  await pause();
  const t = ticket(id);
  assertManager(user(userId), t);
  return status === 'Ожидает уточнения'
    ? `Спасибо за обращение «${t.title}». Уточните, пожалуйста, на каком этапе возникает ситуация, ` +
        'как часто она повторяется и приложите обезличенный пример.'
    : status === 'Отклонено'
      ? 'Спасибо за предложение. Сейчас реализация ограничена доступными ресурсами. ' +
        'Предлагаем вернуться к оценке в следующем плановом периоде; уточним условия повторного рассмотрения.'
      : status === 'Реализовано'
        ? `По обращению «${t.title}» согласован единый порядок работы, ` +
          'назначен владелец процесса и опубликована памятка. Просим проверить результат в вашей работе.'
        : `Спасибо за обращение «${t.title}». Приняли в работу. Проверим описанную ситуацию и зафиксируем результат в этой карточке.`;
}

// Смысловой поиск и группировка работают только на сервере: статическое демо
// честно сообщает, что используется поиск по ключевым словам.
export async function getAiStatus(): Promise<AiStatus> {
  return { search: 'rules', model: '', local: true };
}
export async function getEmerging(_userId: string): Promise<EmergingGroup[]> {
  return [];
}
export async function createCluster(
  _title: string,
  _ticketIds: string[],
  _userId: string,
): Promise<{ id: string; title: string }> {
  throw new Error('Оформление кластера доступно в HTTP-режиме');
}
