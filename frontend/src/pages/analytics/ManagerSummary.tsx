import { useEffect, useRef, useState } from 'react';
import { FileText } from 'lucide-react';
import { generateSummary, isMockMode } from '../../api';
import { AiSource } from '../../components/AiSource';
import { ErrorMessage, Panel } from '../../components/ui';
import type { ManagerSummary as Summary } from '../../types';

export function ManagerSummary({
  days,
  userId,
  revision,
}: {
  days: number;
  userId: string;
  revision: string;
}) {
  const [result, setResult] = useState<Summary | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const requestVersion = useRef(0);
  useEffect(() => {
    requestVersion.current += 1;
    setResult(null);
    setError('');
    setBusy(false);
    return () => {
      requestVersion.current += 1;
    };
  }, [days, userId, revision]);

  return (
    <Panel title="Сводка для руководителя" aside={<FileText size={17} />}>
      <div className="panel-body manager-summary">
        <p className="small muted">
          {isMockMode
            ? 'Доступно с сервером.'
            : 'По кнопке в Gemini отправляются только агрегаты и заголовки. Проверьте рекомендации перед использованием.'}
        </p>
        <ErrorMessage text={error} />
        {busy && <p role="status">Формируем сводку…</p>}
        {result && (
          <>
            <AiSource result={result} />
            <h3>Что важно на этой неделе</h3>
            <ul>
              {result.highlights.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
            <h3>Рекомендуемые действия</h3>
            <ul>
              {result.actions.map((item, index) => (
                <li key={index}>
                  <b>{item.target}:</b> {item.action}
                </li>
              ))}
            </ul>
          </>
        )}
        <button
          disabled={isMockMode || busy}
          onClick={async () => {
            const version = ++requestVersion.current;
            setBusy(true);
            setError('');
            try {
              const response = await generateSummary(days, userId);
              if (version === requestVersion.current) setResult(response);
            } catch (error) {
              if (version === requestVersion.current) setError((error as Error).message);
            } finally {
              if (version === requestVersion.current) setBusy(false);
            }
          }}
        >
          {busy ? 'Формируем…' : 'Сформировать сводку'}
        </button>
      </div>
    </Panel>
  );
}
