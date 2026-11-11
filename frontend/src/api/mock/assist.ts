import { catalogBase } from '../../data/seed';
import { cost } from '../../lib/format';
import type {
  Completeness,
  GenerationMeta,
  RootCause,
  SimilarityContext,
  SolutionHints,
  Ticket,
} from '../../types';
import { cohort } from './analytics';
import { scoreSimilar } from './search-scoring';
import { assertManager, canRead, clone, db, pause, ticket, user } from './storage';

const cache = new Map<string, unknown>();
function cached<T extends GenerationMeta>(
  functionName: string,
  input: unknown,
  value: Omit<T, keyof GenerationMeta>,
): T {
  const key = JSON.stringify([functionName, 'v1', input]);
  const previous = cache.get(key) as T | undefined;
  if (previous) return clone({ ...previous, cached: true });
  const result = {
    ...value,
    source: 'rules',
    cached: false,
    notice: 'В демо используются локальные правила.',
  } as T;
  cache.set(key, result);
  return clone(result);
}
function verification(t: Ticket) {
  if (t.confirmed) return 'подтверждено автором';
  if (t.status === 'Возвращено автором' || t.events.some((e) => e.status === 'Возвращено автором'))
    return 'возвращено автором';
  return t.defaultConfirmed
    ? 'закрыто автоматически, без подтверждения автора'
    : 'ожидает подтверждения автора';
}
export async function checkCompleteness(
  text: string,
  context: SimilarityContext,
  userId: string,
): Promise<Completeness> {
  await pause();
  if (user(userId).role !== 'Сотрудник') throw new Error('Проверка полноты доступна сотруднику');
  if (text.trim().length < 20) throw new Error('Для анализа нужно минимум 20 символов');
  const plain = text.toLowerCase().replaceAll('ё', 'е');
  const questions: string[] = [];
  if (
    !/(?:^|[^а-я])(?:этап[а-я]*|при|когда)(?:$|[^а-я])|на объекте|проектирован|закуп|согласован|подач|пнр|сервис|монтаж|поставк/u.test(
      plain,
    )
  )
    questions.push('Где и на каком этапе возникает проблема?');
  if (!/кажд|часто|раз в|иногда|ежеднев|еженедел|ежемесяч|\d/u.test(plain))
    questions.push('Как часто это происходит: каждый раз или иногда?');
  if (!/\d|например|номер|№/u.test(plain))
    questions.push('Есть ли конкретный пример — номер заявки или объекта?');
  return cached<Completeness>('completeness', [text, context], {
    complete: !questions.length,
    questions,
  });
}
export async function determineRootCause(clusterId: string, userId: string): Promise<RootCause> {
  await pause();
  const tickets = cohort(0, userId).filter((t) => t.clusterId === clusterId);
  if (!tickets.length) throw new Error('В кластере нет обращений в вашей области доступа');
  const affected = new Set(
    tickets.flatMap((t) => [
      t.authorDepartment,
      t.targetDepartment,
      ...t.participants.map((p) => p.department),
    ]),
  );
  const confirmed = tickets
    .filter((t) => t.confirmed && t.changed && t.implementedAt)
    .sort((a, b) => b.implementedAt!.localeCompare(a.implementedAt!));
  const tried = tickets
    .filter((t) => t.implementedAt && t.changed)
    .sort((a, b) => (b.implementedAt || '').localeCompare(a.implementedAt || ''))[0];
  return cached<RootCause>('root_cause', [userId, clusterId, tickets, catalogBase.clusters], {
    cause: `Повторяется в ${tickets.length} обращениях из ${affected.size} подразделений`,
    solution:
      confirmed[0]?.changed.slice(0, 320) || 'Назначить владельца проблемы и решить её системно',
    evidence: [...tickets]
      .sort((a, b) => cost(b) - cost(a) || a.id.localeCompare(b.id))
      .slice(0, 4)
      .map((t) => t.id),
    tried: tried
      ? `${tried.id}: ${tried.changed.slice(0, 150)}. ${verification(tried)}`.slice(0, 260)
      : '',
  });
}
export async function getSolutionHints(id: string, userId: string): Promise<SolutionHints> {
  await pause();
  const t = ticket(id),
    actor = user(userId);
  assertManager(actor, t);
  const candidates = db.tickets.filter(
    (other) =>
      other.id !== id &&
      ['Реализовано', 'Закрыто'].includes(other.status) &&
      other.implementedAt &&
      other.changed,
  );
  const similar = scoreSimilar(candidates, `${t.title}. ${t.text}`, {
    category: t.category,
    targetDepartment: t.targetDepartment,
  })
    .filter((match) => match.matches >= 2)
    .sort((a, b) => b.score - a.score || a.ticket.id.localeCompare(b.ticket.id))
    .slice(0, 3)
    .map(({ ticket: other }) => ({
      id: other.id,
      title: other.title,
      changed: other.changed,
      verification: verification(other),
      canRead: canRead(actor, other),
      assigneeId: other.assigneeId,
    }));
  const recommendation = similar.length
    ? `Похожий случай ${similar[0].id} решили так: ${similar[0].changed.slice(0, 210)}. Проверьте, применимо ли здесь`.slice(
        0,
        360,
      )
    : 'Похожих решённых обращений нет: это новая проблема. Начните с запроса уточнения: этап, частота и конкретный пример.';
  return cached<SolutionHints>('solution_hints', [userId, t, similar], { similar, recommendation });
}
