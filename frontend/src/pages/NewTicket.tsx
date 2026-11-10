import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send } from 'lucide-react';
import { createTicket, previewRouting } from '../api';
import { useApp } from '../store';
import type { RoutePreview, TicketDraft } from '../types';
import { ErrorMessage, Loading, PageTitle } from '../components/ui';
import { ContentFields } from './new-ticket/ContentFields';
import { RoutingPreview } from './new-ticket/RoutingPreview';
import { SimilarTickets } from './new-ticket/SimilarTickets';

export function NewTicket() {
  const { catalog, userId, refresh, notify } = useApp();
  const navigate = useNavigate();
  const [draft, setDraft] = useState<TicketDraft>({
    title: '',
    type: 'Проблема',
    category: catalog!.categories[0],
    targetDepartment: 'Закупки',
    text: '',
    solution: '',
    effect: '',
    priority: 'Средний',
    frequency: 'еженедельно',
    minutes: 30,
    attachments: [],
  });
  const [route, setRoute] = useState<RoutePreview | null>(null);
  const [routeError, setRouteError] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let live = true;
    setRoute(null);
    setRouteError('');
    previewRouting(draft.category, draft.targetDepartment)
      .then((route) => {
        if (live) setRoute(route);
      })
      .catch((error) => {
        if (live) setRouteError(error.message);
      });
    return () => {
      live = false;
    };
  }, [draft.category, draft.targetDepartment]);
  return (
    <>
      <Link to="/mine" className="back-link">
        <ArrowLeft size={15} />
        Мои обращения
      </Link>
      <PageTitle
        title="Новое обращение"
        subtitle="Опишите ситуацию. Система направит обращение ответственному."
      />
      <div className="compose-layout">
        <form
          className="panel compose-form"
          onSubmit={async (event) => {
            event.preventDefault();
            setBusy(true);
            setError('');
            try {
              const ticket = await createTicket(draft, userId);
              await refresh();
              notify(`${ticket.id}: обращение зарегистрировано`);
              navigate(`/tickets/${ticket.id}`);
            } catch (error) {
              setError((error as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className="panel-heading">
            <h2>Содержание обращения</h2>
            <span className="quiet-label">Обязательные поля отмечены *</span>
          </div>
          <div className="panel-body">
            <ContentFields draft={draft} setDraft={setDraft} busy={busy} setBusy={setBusy} />
            <ErrorMessage text={routeError} />
            {route ? <RoutingPreview route={route} /> : !routeError && <Loading />}
            <ErrorMessage text={error} />
            <div className="form-footer">
              <Link to="/mine" className="button">
                Отмена
              </Link>
              <button
                className="primary"
                disabled={busy || !route || draft.text.trim().length < 20}
              >
                <Send size={16} />
                {busy ? 'Сохранение…' : 'Отправить обращение'}
              </button>
            </div>
          </div>
        </form>
        <SimilarTickets draft={draft} setDraft={setDraft} />
      </div>
    </>
  );
}
