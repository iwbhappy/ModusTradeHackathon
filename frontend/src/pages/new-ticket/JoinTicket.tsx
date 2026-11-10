import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Dispatch, SetStateAction } from 'react';
import type { TicketDraft } from '../../types';
import { joinTicket } from '../../api';
import { useApp } from '../../store';
import { ErrorMessage, Field } from '../../components/ui';
import { monthly, number } from '../../lib/format';
import { CostFields } from './CostFields';

export function JoinTicket({
  ticketId,
  problem,
  draft,
  setDraft,
}: {
  ticketId: string;
  problem: boolean;
  draft: TicketDraft;
  setDraft: Dispatch<SetStateAction<TicketDraft>>;
}) {
  const { userId, refresh, notify } = useApp();
  const navigate = useNavigate();
  const [context, setContext] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return (
    <div className="join-form">
      <Field label="Ваш контекст *">
        <textarea
          rows={3}
          value={context}
          onChange={(e) => setContext(e.target.value)}
          placeholder="Где и как возникает у вас?"
        />
      </Field>
      {problem && (
        <>
          <CostFields
            frequency={draft.frequency}
            minutes={draft.minutes}
            onChange={(frequency, minutes) =>
              setDraft((previous) => ({ ...previous, frequency, minutes }))
            }
          />
          <p className="small">
            К потерям добавится ваша оценка: {number(monthly(draft.frequency, draft.minutes))}{' '}
            чел.-ч/мес.
          </p>
        </>
      )}
      <ErrorMessage text={error} />
      <button
        type="button"
        className="primary"
        disabled={busy || context.trim().length < 10}
        onClick={async () => {
          setBusy(true);
          setError('');
          try {
            await joinTicket(ticketId, context, draft.frequency, draft.minutes, userId);
            await refresh();
            notify(`Вы присоединились к ${ticketId}`);
            navigate(`/tickets/${ticketId}`);
          } catch (error) {
            setError((error as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        Присоединиться
      </button>
    </div>
  );
}
