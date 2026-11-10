import originals from './originals.json';
import type { Catalog, Cluster, Database, Frequency, Priority, Rule, Status, Ticket, TicketType, User } from '../types';
import { businessDays } from '../lib/format';

export const departments = ['Продажи', 'Закупки', 'Проектирование', 'Бухгалтерия', 'IT-разработка', 'Сервис и ПНР', 'Склад и логистика', 'Администрация', 'HR'];
export const statuses: Status[] = ['Новое', 'На рассмотрении', 'Ожидает уточнения', 'В работе', 'Реализовано', 'Отклонено', 'Закрыто', 'Возвращено автором'];
export const clusters: Cluster[] = [
  { id: 'purchase', title: 'Неполные заявки на закупку', keywords: ['заявк', 'закуп', 'параметр', 'приобретен'] },
  { id: 'catalog', title: 'Расхождения в номенклатуре', keywords: ['номенклатур', 'издел', 'карточк', 'обозначен', 'каталог'] },
  { id: 'documents', title: 'Непрозрачное согласование документов', keywords: ['документ', 'согласован', 'договор', 'редакци', 'папк', 'верс', 'инструкц'] },
  { id: 'decisions', title: 'Потеря контекста и итоговых решений', keywords: ['коммуникац', 'решени', 'канал', 'задач', 'контекст', 'поручен'] },
  { id: 'systems', title: 'Повторный ввод и обмен данными', keywords: ['систем', 'синхрониз', 'повторный ввод', 'интеграц', 'сведен'] },
  { id: 'knowledge', title: 'Передача знаний и запуск работ', keywords: ['обучен', 'пнр', 'заняти', 'встреч', 'образц', 'наставнич', 'сервис'] }
];
export function detectCluster(text: string) { const scores = clusters.map(c => ({ id: c.id, score: c.keywords.filter(w => text.toLowerCase().includes(w)).length })); const best = scores.sort((a, b) => b.score - a.score)[0]; return best.score ? best.id : ''; }
const authorDepartments: Record<string, string> = { 'Сотрудник закупок': 'Закупки', 'Сотрудник проектирования': 'Проектирование', 'Сотрудник бухгалтерии': 'Бухгалтерия', 'Менеджер по продажам': 'Продажи', 'Координатор проекта': 'Проектирование', 'Руководитель проекта': 'Проектирование', 'Сотрудник офиса': 'Администрация' };
const ownerDepartments: Record<string, string> = { 'Руководитель закупок': 'Закупки', 'Руководитель направления': 'Продажи', 'Ответственный за номенклатуру': 'Проектирование', 'Ответственный за обучение': 'HR', 'Руководитель бухгалтерии': 'Бухгалтерия', 'Ответственный за процессы': 'Администрация', 'IT-специалист': 'IT-разработка', 'Руководитель подразделения': 'Бухгалтерия', 'Ответственный за договоры': 'Продажи', 'Руководитель продаж': 'Продажи', 'Руководитель проектов': 'Проектирование', 'Руководитель проектирования': 'Проектирование', 'Административный руководитель': 'Администрация', 'HR / внутренние коммуникации': 'HR', 'Администратор документов': 'Администрация' };
const titles = ['Неполные параметры в заявках на оборудование', 'Общий статус проекта для закупок', 'Разные обозначения одного изделия', 'Календарь занятий по товарным линейкам', 'Не виден этап согласования документов', 'Памятка для межотдельных операций', 'Повторный ввод в рабочих системах', 'Инструкция для новых сотрудников', 'Ответственность за версии договора', 'Подтверждение результата перед закрытием', 'Срок ответа смежных подразделений', 'Единое место для итоговых решений', 'История изменений спецификации', 'Загрузка проектной группы', 'Минимальные требования к постановке задач', 'Практические занятия с оборудованием', 'Зона для коротких перерывов', 'Польза внутренних учебных встреч', 'Актуальная редакция инструкции', 'Обзор завершённых улучшений'];
const syntheticTopics = [
  ['Комплектность заявки на поставку', 'В заявке на закупку не указаны условия эксплуатации оборудования. Нужен единый шаблон с обязательными параметрами.', 'Межотдельное взаимодействие', 'Закупки', 'purchase'],
  ['Проверка аналогов в спецификации', 'Обозначения аналогов изделия расходятся в каталоге и спецификации. Нужна проверка актуальной карточки номенклатуры.', 'Каталог и данные', 'Проектирование', 'catalog'],
  ['Этапы согласования первичных документов', 'Не видно, у кого находится пакет документов на согласовании. Предлагаю показывать этап и ожидаемую дату ответа.', 'Документооборот', 'Бухгалтерия', 'documents'],
  ['Фиксация решений после обсуждения', 'Итоговые решения по задаче остаются в разных каналах. Предлагаю фиксировать результат и ответственного в одной карточке.', 'Коммуникации', 'IT-разработка', 'decisions'],
  ['Обмен данными о комплектации', 'Повторный ввод сведений о комплектации в разных системах отнимает время. Нужна оценка безопасной синхронизации.', 'Интеграции и IT', 'IT-разработка', 'systems'],
  ['Передача оборудования на ПНР', 'При запуске ПНР нет краткой инструкции по проверке оборудования. Предлагаю обучение и единый список контрольных операций.', 'Обучение', 'Сервис и ПНР', 'knowledge'],
  ['Обязательные поля складской заявки', 'В заявках на приобретение не указан срок и назначение изделия. Приходится уточнять параметры у проектной группы.', 'Межотдельное взаимодействие', 'Закупки', 'purchase'],
  ['Актуальная версия приложения к договору', 'Перед отправкой договора трудно определить актуальную редакцию приложения. Предлагаю фиксировать версию и владельца согласования.', 'Договорная работа', 'Продажи', 'documents']
];

export function createSeed(): Database {
  const employees: User[] = Object.keys(authorDepartments).map((name, i) => ({ id: `employee-${i + 1}`, name, role: 'Сотрудник', department: authorDepartments[name], vacation: false }));
  const managers: User[] = Object.keys(ownerDepartments).map((name, i) => ({ id: `manager-${i + 1}`, name, role: 'Руководитель', department: ownerDepartments[name], vacation: false }));
  departments.forEach((department, i) => {
    employees.push({ id: `specialist-${i}`, name: `${department === 'Проектирование' ? 'Инженер-проектировщик' : 'Специалист ' + department.toLowerCase()} 2`, role: 'Сотрудник', department, vacation: false });
    if (!managers.some(u => u.department === department)) managers.push({ id: `head-${i}`, name: `Руководитель: ${department}`, role: 'Руководитель', department, vacation: false });
  });
  const users = [...employees, ...managers, { id: 'admin', name: 'Администратор системы', role: 'Администратор' as const, department: 'IT-разработка', vacation: false }];
  const categories = [...new Set(originals.map(t => t.category))];
  const rules: Rule[] = categories.map((category, i) => {
    const original = originals.find(t => t.category === category)!;
    const primary = managers.find(u => u.name === original.assignee)!;
    const backup = managers.find(u => u.id !== primary.id && u.department === primary.department) || managers.find(u => u.name === 'Ответственный за процессы')!;
    return { id: `rule-${i}`, category, department: '', primaryId: primary.id, backupId: backup.id, responseDays: original.priority === 'Высокий' ? 1 : 2, resolutionDays: original.priority === 'Высокий' ? 5 : 10 };
  });
  const now = new Date();
  const make = (i: number, raw: { id: string; type: TicketType; category: string; authorId: string; priority: Priority; status: Status; text: string; assigneeId: string; title: string; target?: string; cluster?: string }): Ticket => {
    const created = new Date(now); created.setDate(created.getDate() - (i < 20 ? (i * 3 + 4) % 68 : Math.max(7, (i * 7 + 3) % 69))); created.setHours(9, 0, 0, 0);
    const author = users.find(u => u.id === raw.authorId)!;
    const assignee = users.find(u => u.id === raw.assigneeId)!;
    const response = new Date(created.getTime() + (4 + i % 30) * 3600000).toISOString();
    const realized = raw.status === 'Реализовано' || (raw.status === 'Закрыто' && raw.type !== 'Положительный отзыв');
    const changed = realized ? (raw.id === 'A-004' ? 'Запланирован пробный обучающий семинар; опубликован календарь встреч.' : raw.id === 'A-008' ? 'Создана учебная инструкция с типовыми ошибками и контактами наставников.' : 'Введён единый шаблон и определён владелец процесса. Памятка доступна всем затронутым подразделениям.') : raw.id === 'A-018' ? 'Положительный отзыв передан организаторам. Формат учебных встреч сохранён.' : '';
    const events: Ticket['events'] = [{ id: `${raw.id}-created`, date: created.toISOString(), actor: author.name, text: 'Обращение зарегистрировано', status: 'Новое' }];
    if (raw.status !== 'Новое') events.push({ id: `${raw.id}-response`, date: response, actor: assignee.name, text: 'Обращение принято на рассмотрение', status: 'На рассмотрении' });
    const stage = businessDays(new Date(response), 2);
    if (!['Новое', 'На рассмотрении'].includes(raw.status)) events.push({ id: `${raw.id}-stage`, date: stage, actor: assignee.name, text: raw.status === 'Ожидает уточнения' ? 'Запрошен пример и дополнительный контекст' : `Статус: ${raw.status}`, status: raw.status });
    const rejection = raw.status === 'Отклонено' ? 'Сейчас нет подходящего помещения. Вернёмся к вопросу при перепланировке рабочих помещений.' : '';
    return { id: raw.id, type: raw.type, category: raw.category, priority: raw.priority, status: raw.status, text: raw.text, title: raw.title, authorId: raw.authorId, authorDepartment: author.department, assigneeId: raw.assigneeId, targetDepartment: raw.target || assignee.department,
      createdAt: created.toISOString(), responseDueAt: businessDays(created, rules.find(r => r.category === raw.category)?.responseDays || 2), dueAt: businessDays(created, rules.find(r => r.category === raw.category)?.resolutionDays || 10), firstResponseAt: raw.status === 'Новое' ? undefined : response, implementedAt: realized ? stage : undefined, closedAt: ['Закрыто', 'Отклонено'].includes(raw.status) ? stage : undefined,
      events, comments: raw.status === 'Ожидает уточнения' ? [{ id: `${raw.id}-question`, date: stage, author: assignee.name, text: raw.id === 'A-005' ? 'Уточните, пожалуйста, виды документов и ключевые этапы согласования. Приложите обезличенный пример.' : 'Уточните формат исходных файлов и приведите пример изменения спецификации.' }] : [],
      participants: raw.type === 'Проблема' ? employees.filter(u => u.id !== author.id).slice(i % 4, i % 4 + 1 + i % 4).map(u => ({ userId: u.id, department: u.department, context: 'Встречаемся с аналогичной ситуацией при передаче данных между подразделениями.', frequency: 'еженедельно' as Frequency, minutes: 30 })) : [],
      frequency: i % 3 === 0 ? 'ежедневно' : 'еженедельно', minutes: [15, 30, 60, 120][i % 4], solution: '', effect: '', changed, rejection, confirmed: (raw.status === 'Закрыто' && realized), attachments: [], clusterId: raw.cluster || detectCluster(raw.text + ' ' + raw.category) };
  };
  const tickets = originals.map((r, i) => make(i, { ...r, type: r.type as TicketType, priority: r.priority as Priority, status: r.status as Status, authorId: employees.find(u => u.name === r.author)!.id, assigneeId: managers.find(u => u.name === r.assignee)!.id, title: titles[i] }));
  for (let i = 0; i < 40; i++) {
    const topic = syntheticTopics[i % syntheticTopics.length];
    const rule = rules.find(r => r.category === topic[2])!;
    tickets.push(make(i + 20, { id: `S-${String(i + 1).padStart(3, '0')}`, type: i % 7 === 0 ? 'Предложение' : 'Проблема', category: topic[2], authorId: employees[(i * 3 + 2) % employees.length].id, priority: ['Средний', 'Высокий', 'Низкий'][i % 3] as Priority, status: ['Новое', 'В работе', 'Реализовано', 'На рассмотрении', 'Ожидает уточнения', 'Закрыто', 'В работе'][i % 7] as Status, text: topic[1] + ` Ситуация повторяется ${i % 2 === 0 ? 'при подготовке недельного плана' : 'при передаче задачи смежному подразделению'}.`, assigneeId: rule.primaryId, title: topic[0] + [' · подготовка', ' · передача', ' · проверка', ' · исполнение', ' · приёмка'][Math.floor(i / 8)], target: topic[3], cluster: topic[4] }));
  }
  return { version: 1, users, rules, tickets };
}
export const catalogBase: Pick<Catalog, 'departments' | 'categories' | 'statuses' | 'clusters'> = { departments, categories: [...new Set(originals.map(r => r.category))], statuses, clusters };
