const TITLE_LIMIT = 80;

export function makeTitle(text: string, provided = ''): string {
  if (provided.trim()) return provided.trim();
  const sentence = text
    .trim()
    .split(/[.!?\n]/u)[0]
    .trim();
  if (sentence.length <= TITLE_LIMIT) return sentence;
  const words = sentence.split(/\s+/u);
  const result: string[] = [];
  for (const word of words) {
    if ([...result, word].join(' ').length > TITLE_LIMIT - 1) break;
    result.push(word);
  }
  return `${result.join(' ') || 'Обращение'}…`;
}
