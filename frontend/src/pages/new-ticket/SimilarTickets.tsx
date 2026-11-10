import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ScanSearch } from 'lucide-react';
import { findSimilar, getAiStatus } from '../../api';
import type { AiStatus, SimilarTicket, TicketDraft } from '../../types';
import { useApp } from '../../store';
import { cost, number } from '../../lib/format';
import { Badge, Empty, ErrorMessage, Loading, Panel } from '../../components/ui';
import { JoinTicket } from './JoinTicket';

const OUTCOME_LABEL = { done: 'Что изменилось', rejected: 'Почему отклонено' } as const;

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
  const [status, setStatus] = useState<AiStatus | null>(null);
  useEffect(() => {
    getAiStatus()
      .then(setStatus)
      .catch(() => setStatus(null));
  }, []);
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
  const open = similar.filter((ticket) => ticket.outcome === 'open');
  const closed = similar.filter((ticket) => ticket.outcome !== 'open');
  // Первой показываем группу с самым сильным совпадением: ответ сервера уже отсортирован.
  const closedFirst = similar.length > 0 && similar[0].outcome !== 'open';
  const openCards = open.map((ticket) => {
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
  });
  const closedCards = (
    <>
      {closed.length > 0 && <h4 className="similar-group">Уже рассмотрено</h4>}
      {closed.map((ticket) => (
        <article className="similar-card resolved" key={ticket.id}>
          <div className="between">
            <span className="mono ticket-id">{ticket.id}</span>
            <Badge status={ticket.status} />
          </div>
          <h3>{ticket.title}</h3>
          <p className="match-explanation">{ticket.matchExplanation}</p>
          {ticket.outcome !== 'open' && ticket.outcomeText && (
            <div className="outcome">
              <span>{OUTCOME_LABEL[ticket.outcome]}</span>
              <p>{ticket.outcomeText}</p>
            </div>
          )}
        </article>
      ))}
    </>
  );
  return (
    <aside className="similar-panel">
      <Panel title="Похожие обращения" aside={<ScanSearch size={17} />}>
        <div className="panel-body">
          <p className="muted small">
            Возможно, эту проблему уже решают или уже решили. Присоединитесь к открытому обращению
            или посмотрите результат.
          </p>
          {status && (
            <p className="search-mode">
              {status.search === 'semantic'
                ? 'Поиск по смыслу · локальная модель, данные не покидают контур'
                : 'Поиск по ключевым словам'}
            </p>
          )}
          <ErrorMessage text={error} />
          {finding ? (
            <Loading />
          ) : !similar.length ? (
            <Empty
              text={draft.text.length < 8 ? 'Начните описывать ситуацию' : 'Похожих обращений нет'}
            />
          ) : (
            <>
              {closedFirst && closedCards}
              {openCards}
              {!closedFirst && closedCards}
            </>
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
