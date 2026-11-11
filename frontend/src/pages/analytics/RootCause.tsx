import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { determineRootCause } from '../../api';
import { AiSource } from '../../components/AiSource';
import { ErrorMessage } from '../../components/ui';
import type { RootCause as RootCauseResult } from '../../types';

export function RootCause({
  clusterId,
  userId,
  openTicket,
}: {
  clusterId: string;
  userId: string;
  openTicket: (id: string) => Promise<void>;
}) {
  const [result, setResult] = useState<RootCauseResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return (
    <section className="system-box ai-assistant" aria-label="Корневая причина">
      <div className="between">
        <h3>Корневая причина</h3>
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError('');
            try {
              setResult(await determineRootCause(clusterId, userId));
            } catch (error) {
              setError((error as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <Search size={15} />
          {busy ? 'Определяем…' : 'Определить'}
        </button>
      </div>
      <ErrorMessage text={error} />
      {result && (
        <>
          <AiSource result={result} />
          <dl className="assistant-result">
            <dt>Причина</dt>
            <dd>{result.cause}</dd>
            <dt>Системное решение</dt>
            <dd>{result.solution}</dd>
            <dt>На чём основано</dt>
            <dd className="assistant-links">
              {result.evidence.map((id) => (
                <Link
                  key={id}
                  to={`/tickets/${id}`}
                  onClick={(event) => {
                    event.preventDefault();
                    void openTicket(id);
                  }}
                >
                  {id}
                </Link>
              ))}
            </dd>
            {result.tried && (
              <>
                <dt>Что уже пробовали</dt>
                <dd>{result.tried}</dd>
              </>
            )}
          </dl>
        </>
      )}
    </section>
  );
}
