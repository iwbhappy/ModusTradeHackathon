import { Tracking } from './ticket-detail/Tracking';
import { Resolution } from './ticket-detail/Resolution';
import { Discussion } from './ticket-detail/Discussion';
import { Participants } from './ticket-detail/Participants';
import { History } from './ticket-detail/History';
import { Metadata } from './ticket-detail/Metadata';
import { TicketActions } from './ticket-detail/TicketActions';
import { RelatedTickets } from './ticket-detail/RelatedTickets';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Paperclip } from 'lucide-react';
import { downloadAttachment, getTicket, listTickets } from '../api';
import { useApp } from '../store';
import type { Ticket } from '../types';
import { terminal } from '../lib/format';
import { canManage, canComment } from '../lib/permissions';
import { Badge, ErrorMessage, Loading, PageTitle, Panel } from '../components/ui';

export function TicketDetail() {
  const { id = '' } = useParams();
  const { catalog, userId, revision, refresh, notify, selectUser } = useApp();
  const navigate = useNavigate();
  const [t, setTicket] = useState<Ticket | null>(null);
  const [related, setRelated] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let live = true;
    setLoading(true);
    setError('');
    getTicket(id, userId)
      .then(async (ticket) => {
        if (!live) return;
        setTicket(ticket);
        const list = ticket.clusterId
          ? await listTickets(userId, { cluster: ticket.clusterId })
          : [];
        if (live) setRelated(list);
      })
      .catch((e) => {
        if (live) {
          setTicket(null);
          setError(e.message);
        }
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [id, userId, revision]);
  if (!catalog) return null;
  const current = catalog.users.find((u) => u.id === userId)!;
  const home =
    current.role === 'Сотрудник' ? '/mine' : current.role === 'Руководитель' ? '/inbox' : '/all';
  if (loading && (!t || t.id !== id)) return <Loading />;
  if (!t)
    return (
      <>
        <Link className="back-link" to={home}>
          <ArrowLeft size={15} />
          Вернуться
        </Link>
        <ErrorMessage text={error} />
      </>
    );
  const manager = current.role === 'Руководитель';
  const manages = canManage(current, t, catalog.users);
  const receiver = catalog.users.find((u) => u.id === t.assigneeId)!;
  const run = async (operation: () => Promise<unknown>, message: string) => {
    setBusy(true);
    setError('');
    try {
      await operation();
      await refresh();
      notify(message);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <Link to={home} className="back-link">
        <ArrowLeft size={15} />
        {current.role === 'Администратор'
          ? 'Все обращения'
          : manager
            ? 'Входящие'
            : 'Мои обращения'}
      </Link>
      <PageTitle
        title={t.title}
        subtitle={`${t.id} · ${t.type} · ${t.category}`}
        action={<Badge status={t.status} />}
      />
      <div className="info-strip">
        <div>
          <strong>Обращение получил: {receiver.name}</strong>
          <p>
            {receiver.role} · {receiver.department}
          </p>
          {catalog.demoMode && receiver.id !== userId && (
            <button
              className="text-button"
              disabled={busy}
              onClick={async () => {
                try {
                  await selectUser(receiver.id);
                  navigate(`/tickets/${t.id}`);
                } catch (error) {
                  notify((error as Error).message);
                }
              }}
            >
              Открыть как {receiver.name}
            </button>
          )}
        </div>
      </div>
      <Tracking t={t} />
      <ErrorMessage text={error} />
      <div className="detail-layout">
        <div className="detail-main">
          {t.rejection && t.status === 'Отклонено' && (
            <Panel title="Причина отказа">
              <div className="panel-body">
                <p>{t.rejection}</p>
                <p className="small muted">Мотивировка сохранена в истории обращения.</p>
              </div>
            </Panel>
          )}
          {t.changed && ['Реализовано', 'Закрыто', 'Возвращено автором'].includes(t.status) && (
            <Resolution t={t} run={run} busy={busy} />
          )}
          <Panel title="Описание обращения">
            <div className="panel-body">
              <p className="preserve">{t.text}</p>
              {t.solution && (
                <>
                  <h3>Предлагаемое решение</h3>
                  <p className="preserve">{t.solution}</p>
                </>
              )}
              {t.effect && (
                <>
                  <h3>Ожидаемый эффект</h3>
                  <p>{t.effect}</p>
                </>
              )}
              {t.attachments.length > 0 && (
                <div className="attachment-list">
                  {(t.attachmentFiles || []).map((file) => (
                    <button
                      className="file-chip"
                      key={file.id}
                      onClick={() =>
                        downloadAttachment(file.id, file.name, userId).catch((error) =>
                          setError(error.message),
                        )
                      }
                    >
                      <Paperclip size={14} />
                      {file.name}
                      <small>{Math.ceil(file.size / 1024)} КБ · скачать</small>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </Panel>
          <Discussion
            t={t}
            run={run}
            busy={busy}
            readOnly={!canComment(current, t, catalog.users)}
          />
          {t.participants.length > 0 && <Participants t={t} />}
          <History t={t} />
        </div>
        <aside className="detail-aside">
          <Metadata t={t} />
          {(manages || current.role === 'Администратор') && !terminal(t) && (
            <TicketActions t={t} run={run} busy={busy} canDecide={manages} />
          )}
          {t.clusterId && <RelatedTickets t={t} related={related} manager={manager} />}
        </aside>
      </div>
    </>
  );
}
