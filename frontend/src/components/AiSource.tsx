import type { GenerationMeta } from '../types';

export function AiSource({ result }: { result: GenerationMeta }) {
  return (
    <div className="ai-source" role="status">
      <p className="small muted">
        {result.source === 'llm'
          ? 'Сформировано Gemini (внешний сервис) · проверьте перед сохранением'
          : 'Автоподсказка по правилам'}
        {result.cached && ' · из кеша'}
      </p>
      {result.notice && <p className="small">{result.notice}</p>}
    </div>
  );
}
