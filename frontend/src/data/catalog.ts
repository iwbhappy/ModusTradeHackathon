import originals from './originals.json';
import type { Catalog, Cluster, Status } from '../types';
export const departments = [
  'Продажи',
  'Закупки',
  'Проектирование',
  'Бухгалтерия',
  'IT-разработка',
  'Сервис и ПНР',
  'Склад и логистика',
  'Администрация',
  'HR',
];
export const statuses: Status[] = [
  'Новое',
  'На рассмотрении',
  'Ожидает уточнения',
  'В работе',
  'Реализовано',
  'Отклонено',
  'Закрыто',
  'Возвращено автором',
];
export const clusters: Cluster[] = [
  {
    id: 'purchase',
    title: 'Неполные заявки на закупку',
    keywords: ['заявк', 'закуп', 'параметр', 'приобретен'],
  },
  {
    id: 'catalog',
    title: 'Расхождения в номенклатуре',
    keywords: ['номенклатур', 'издел', 'карточк', 'обозначен', 'каталог'],
  },
  {
    id: 'documents',
    title: 'Непрозрачное согласование документов',
    keywords: ['документ', 'согласован', 'договор', 'редакци', 'папк', 'верс', 'инструкц'],
  },
  {
    id: 'decisions',
    title: 'Потеря контекста и итоговых решений',
    keywords: ['коммуникац', 'решени', 'канал', 'задач', 'контекст', 'поручен'],
  },
  {
    id: 'systems',
    title: 'Повторный ввод и обмен данными',
    keywords: ['систем', 'синхрониз', 'повторный ввод', 'интеграц', 'сведен'],
  },
  {
    id: 'knowledge',
    title: 'Передача знаний и запуск работ',
    keywords: ['обучен', 'пнр', 'заняти', 'встреч', 'образц', 'наставнич', 'сервис'],
  },
];
export function detectCluster(text: string) {
  const scores = clusters.map((c) => ({
    id: c.id,
    score: c.keywords.filter((w) => text.toLowerCase().includes(w)).length,
  }));
  const best = scores.sort((a, b) => b.score - a.score)[0];
  return best.score ? best.id : '';
}
export const catalogBase: Pick<Catalog, 'departments' | 'categories' | 'statuses' | 'clusters'> = {
  departments,
  categories: [...new Set(originals.map((r) => r.category))],
  statuses,
  clusters,
};
