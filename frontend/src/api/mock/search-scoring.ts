import type { SimilarityContext, Ticket } from '../../types';

const stopWords = new Set(
  (
    'а без более бы был была были было быть в вам вас весь во вот все всего всех вы где да ' +
    'даже для до его ее если есть еще же за здесь и из или им их к как когда кто ли либо ' +
    'мы на над нам нас наш не него нее нет ни но нужно нужна нужен нужны ну о об от ' +
    'по под после при про раз с со так там то того тоже только том ты у уже хоть что ' +
    'чтобы эта эти это этот я иногда часто несколько каждый можно предлагаю приходится'
  ).split(' '),
);

const roots: [RegExp, string, string][] = [
  [/^заяв(?:к|ок)/u, 'заявк', 'заявка'],
  [/^назнач/u, 'назначен', 'назначение'],
  [/^парамет/u, 'параметр', 'параметры'],
  [/^закуп/u, 'закупк', 'закупка'],
  [/^уточн/u, 'уточнен', 'уточнение'],
  [/^проектиров/u, 'проектировщик', 'проектировщик'],
  [/^номенклат/u, 'номенклатур', 'номенклатура'],
  [/^обознач/u, 'обозначен', 'обозначение'],
  [/^спецификац/u, 'спецификаци', 'спецификация'],
  [/^согласован/u, 'согласован', 'согласование'],
  [/^документ/u, 'документ', 'документы'],
  [/^повторн/u, 'повторн', 'повторный'],
];

export function normalizeWord(word: string): string {
  const plain = word.toLowerCase().replaceAll('ё', 'е');
  const root = roots.find(([pattern]) => pattern.test(plain));
  if (root) return root[1];
  if (plain.length <= 4) return plain;
  return plain.replace(
    /(?:иями|ями|ами|ого|его|ому|ему|ыми|ими|ение|ения|ов|ев|ий|ый|ой|ая|яя|ое|ее|ые|ие|ую|юю|ах|ях|ом|ем|ам|ям|ы|и|а|я|у|ю|е|о)$/u,
    '',
  );
}

function words(text: string): string[] {
  return (
    text
      .toLowerCase()
      .replaceAll('ё', 'е')
      .match(/[а-яa-z0-9]+/gu) || []
  ).filter((word) => word.length >= 3 && !stopWords.has(word));
}

export function scoreSimilar(corpus: Ticket[], query: string, context: SimilarityContext) {
  const queryWords = words(query);
  const terms = [...new Set(queryWords.map(normalizeWord))];
  const documents = corpus.map((ticket) => ({
    ticket,
    title: new Set(words(ticket.title).map(normalizeWord)),
    body: new Set(words(ticket.text).map(normalizeWord)),
  }));
  const idf = (term: string) => {
    const count = documents.filter((doc) => doc.title.has(term) || doc.body.has(term)).length;
    return 1 + Math.log((corpus.length + 1) / (count + 1));
  };
  return documents.map(({ ticket, title, body }) => {
    const matched = terms.filter((term) => title.has(term) || body.has(term));
    const contentScore = matched.reduce(
      (sum, term) => sum + idf(term) * ((title.has(term) ? 3 : 0) + (body.has(term) ? 1 : 0)),
      0,
    );
    const categoryBonus = context.category === ticket.category ? 1.6 : 0;
    const departmentBonus = context.targetDepartment === ticket.targetDepartment ? 1.1 : 0;
    const score =
      contentScore / Math.sqrt(Math.max(8, title.size + body.size)) +
      categoryBonus +
      departmentBonus;
    const explanations = matched
      .sort((a, b) => idf(b) - idf(a))
      .slice(0, 3)
      .map(
        (term) =>
          roots.find((root) => root[1] === term)?.[2] ||
          queryWords.find((word) => normalizeWord(word) === term) ||
          term,
      );
    return {
      ticket,
      score,
      matches: matched.length,
      explanation: `Совпадение: ${explanations.join(', ')}`,
    };
  });
}
