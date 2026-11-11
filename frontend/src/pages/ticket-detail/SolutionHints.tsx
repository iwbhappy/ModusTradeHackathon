import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BookOpen } from 'lucide-react';
import { getSolutionHints } from '../../api';
import { AiSource } from '../../components/AiSource';
import { ErrorMessage } from '../../components/ui';
import { useApp } from '../../store';
import type { SolutionHints as SolutionHintsResult } from '../../types';

export function SolutionHints({
  ticketId,
  disabled,
  onUse,
}: {
  ticketId: string;
  disabled: boolean;
  onUse: (result: SolutionHintsResult) => void;
}) {
  const { userId, selectUser, notify } = useApp();
  const navigate = useNavigate();
  const [result, setResult] = useState<SolutionHintsResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return (
    <section className="system-box ai-assistant" aria-label="Как решали похожее">
      <div className="between">
        <h3>
          <BookOpen size={16} />
          Как решали похожее
        </h3>
        <button
          type="button"
          disabled={disabled || busy}
          onClick={async () => {
            setBusy(true);
            setError('');
            try {
              setResult(await getSolutionHints(ticketId, userId));
            } catch (error) {
              setError((error as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? 'Подбираем…' : 'Показать'}
        </button>
      </div>
      <ErrorMessage text={error} />
      {result && (
        <>
          <AiSource result={result} />
          <div className="assistant-history">
            {result.similar.map((ticket) => (
              <article key={ticket.id}>
                <Link
                  to={`/tickets/${ticket.id}`}
                  onClick={async (event) => {
                    if (!ticket.canRead) {
                      event.preventDefault();
                      try {
                        await selectUser(ticket.assigneeId);
                        navigate(`/tickets/${ticket.id}`);
                      } catch (error) {
                        notify((error as Error).message);
                      }
                    }
                  }}
                >
                  {ticket.id} · {ticket.title}
                </Link>
                <p>{ticket.changed}</p>
                <p className="small muted">{ticket.verification}</p>
              </article>
            ))}
          </div>
          <h4>Рекомендация</h4>
          <p>{result.recommendation}</p>
          <button type="button" disabled={disabled} onClick={() => onUse(result)}>
            Использовать в ответе
          </button>
        </>
      )}
    </section>
  );
}
