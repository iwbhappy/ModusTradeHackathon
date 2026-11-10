import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ScanSearch } from 'lucide-react';
import { findSimilar } from '../../api';
import type { SimilarTicket, TicketDraft } from '../../types';
import { useApp } from '../../store';
import { cost, number } from '../../lib/format';
import { Badge, Empty, ErrorMessage, Loading, Panel } from '../../components/ui';
import { JoinTicket } from './JoinTicket';

export function SimilarTickets({
  draft,
  setDraft,
}: {
  draft: TicketDraft;
  setDraft: Dispatch<SetStateAction<TicketDraft>>;
}) {
  const { userId } = useApp();
  const [similar, setSimilar] = useState<SimilarTicket[]>([]);
  const [finding, setFinding] = useState(false);
  const [joinId, setJoinId] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    let live = true;
    setFinding(draft.text.length >= 8);
    setError('');
    const timer = setTimeout(() => {
      findSimilar(draft.text, userId, {
        category: draft.category,
        targetDepartment: draft.targetDepartment,
      })
        .then((tickets) => {
          if (live) setSimilar(tickets);
        })
        .catch((error) => {
          if (live) setError(error.message);
        })
        .finally(() => {
          if (live) setFinding(false);
        });
    }, 450);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [draft.text, draft.category, draft.targetDepartment, userId]);
  return (
    <aside className="similar-panel">
      <Panel title="Похожие обращения" aside={<ScanSearch size={17} />}>
        <div className="panel-body">
          <p className="muted small">
            Возможно, эту проблему уже решают. Присоединитесь и добавьте свой контекст.
          </p>
          <ErrorMessage text={error} />
          {finding ? (
            <Loading />
          ) : !similar.length ? (
            <Empty
              text={
                draft.text.length < 8
                  ? 'Начните описывать ситуацию'
                  : 'Похожих открытых обращений нет'
              }
            />
          ) : (
            similar.map((ticket) => {
              const joined =
                ticket.authorId === userId ||
                ticket.participants.some((participant) => participant.userId === userId);
              const departments = new Set([
                ticket.authorDepartment,
                ...ticket.participants.map((participant) => participant.department),
              ]);
              return (
                <article className="similar-card" key={ticket.id}>
                  <div className="between">
                    <span className="mono ticket-id">{ticket.id}</span>
                    <Badge status={ticket.status} />
                  </div>
                  <h3>{ticket.title}</h3>
                  <p className="match-explanation">{ticket.matchExplanation}</p>
                  <p className="small muted">
                    {ticket.participants.length + 1} участников · {departments.size} подразделения
                  </p>
                  {ticket.type === 'Проблема' && (
                    <div className="small">
                      ≈ <span className="mono">{number(cost(ticket))}</span> чел.-ч/мес
                    </div>
                  )}
                  {joined ? (
                    <Link className="text-button" to={`/tickets/${ticket.id}`}>
                      Уже в ваших обращениях <ArrowRight size={14} />
                    </Link>
                  ) : (
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => setJoinId(joinId === ticket.id ? '' : ticket.id)}
                    >
                      У меня то же самое → присоединиться
                    </button>
                  )}
                  {joinId === ticket.id && (
                    <JoinTicket
                      key={ticket.id}
                      ticketId={ticket.id}
                      problem={ticket.type === 'Проблема'}
                      draft={draft}
                      setDraft={setDraft}
                    />
                  )}
                </article>
              );
            })
          )}
        </div>
      </Panel>
      <div className="privacy-note">
        <strong>Что произойдёт дальше</strong>
        <p>
          Ответственный увидит обращение в очереди. Все ответы, изменения статуса и результат
          появятся в карточке обращения.
        </p>
      </div>
    </aside>
  );
}
