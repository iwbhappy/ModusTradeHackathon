import { useEffect, useRef, useState } from 'react';
import { Check, ScanSearch, Wand2 } from 'lucide-react';
import { suggestStructure } from '../../api';
import type { Structure } from '../../types';
import { ErrorMessage } from '../../components/ui';
import { AiSource } from '../../components/AiSource';

export function StructureSuggestion({
  text,
  category,
  targetDepartment,
  busy,
  setBusy,
  onAccept,
}: {
  text: string;
  category: string;
  targetDepartment: string;
  busy: boolean;
  setBusy: (busy: boolean) => void;
  onAccept: (structure: Structure) => void;
}) {
  const [structure, setStructure] = useState<Structure | null>(null);
  const [error, setError] = useState('');
  const requestVersion = useRef(0);
  useEffect(() => {
    requestVersion.current += 1;
    setStructure(null);
    setError('');
    return () => {
      requestVersion.current += 1;
    };
  }, [text, category, targetDepartment]);
  return (
    <>
      <div className="structure-button">
        <button
          type="button"
          disabled={busy || text.trim().length < 20}
          onClick={async () => {
            const version = ++requestVersion.current;
            setBusy(true);
            setError('');
            try {
              const result = await suggestStructure(text, { category, targetDepartment });
              if (version === requestVersion.current) setStructure(result);
            } catch (error) {
              if (version === requestVersion.current) setError((error as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <Wand2 size={16} />
          Структурировать текст
        </button>
        <small>При включённом Gemini текст отправляется во внешний сервис по кнопке.</small>
      </div>
      <ErrorMessage text={error} />
      {structure && (
        <div className="system-box">
          <div className="section-label">
            <ScanSearch size={16} />
            <strong>Предлагаемая структура</strong>
          </div>
          <AiSource result={structure} />
          <dl className="structure">
            <dt>Кратко о сути</dt>
            <dd>{structure.title}</dd>
            <dt>Проблема</dt>
            <dd>{structure.problem}</dd>
            <dt>Предлагаемое решение</dt>
            <dd>{structure.solution}</dd>
            <dt>Ожидаемый эффект</dt>
            <dd>{structure.effect}</dd>
          </dl>
          <p className="small">
            Категория: {structure.category} · Приоритет: {structure.priority}
          </p>
          <div className="button-row">
            <button
              type="button"
              onClick={() => {
                onAccept(structure);
                setStructure(null);
              }}
            >
              <Check size={15} />
              Принять
            </button>
            <button type="button" onClick={() => setStructure(null)}>
              Отклонить
            </button>
          </div>
        </div>
      )}
    </>
  );
}
