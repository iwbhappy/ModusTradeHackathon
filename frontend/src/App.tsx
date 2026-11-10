import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { useEffect, useState } from 'react';
import { Navigate, NavLink, Route, Routes, useNavigate } from 'react-router-dom';
import { CheckCheck, CircleHelp, ListFilter, X } from 'lucide-react';
import { useApp } from './store';
import { resetDemo } from './api';
import { ErrorMessage, Loading, Modal } from './components/ui';
import { TicketList } from './pages/TicketList';
import { NewTicket } from './pages/NewTicket';
import { TicketDetail } from './pages/TicketDetail';
import { Improvements } from './pages/Improvements';
import { AnalyticsPage } from './pages/Analytics';
import { RoutingPage } from './pages/RoutingPage';
import { UsersPage } from './pages/UsersPage';

export default function App() {
  const { catalog, userId, load, notice, notify, refresh } = useApp();
  const navigate = useNavigate();
  const [reset, setReset] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    load().catch((e) => setError(String(e)));
  }, [load]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => notify(''), 5500);
    return () => clearTimeout(timer);
  }, [notice, notify]);
  if (!catalog) return error ? <ErrorMessage text={error} /> : <Loading />;
  const current = catalog.users.find((u) => u.id === userId)!;
  const home =
    current.role === 'Сотрудник'
      ? '/mine'
      : current.role === 'Руководитель'
        ? '/inbox'
        : '/routing';
  return (
    <div className="app-shell">
      <Sidebar
        home={home}
        onReset={() => {
          setError('');
          setReset(true);
        }}
      />
      <div className="app-content">
        <Header home={home} />
        <main key={userId}>
          <div className="breadcrumb">
            <span>Модус Трейд</span>
            <span>/</span>
            <span>Обратная связь сотрудников</span>
            <div className="prototype-label">
              <CircleHelp size={13} />
              Демонстрационные данные
            </div>
          </div>
          <Routes>
            <Route path="/" element={<Navigate to={home} replace />} />
            <Route
              path="/mine"
              element={
                current.role === 'Сотрудник' ? (
                  <TicketList mode="mine" />
                ) : (
                  <Navigate to={home} replace />
                )
              }
            />
            <Route
              path="/new"
              element={
                current.role === 'Сотрудник' ? <NewTicket /> : <Navigate to={home} replace />
              }
            />
            <Route
              path="/inbox"
              element={
                current.role === 'Руководитель' ? (
                  <TicketList mode="inbox" />
                ) : (
                  <Navigate to={home} replace />
                )
              }
            />
            <Route path="/tickets/:id" element={<TicketDetail />} />
            <Route path="/done" element={<Improvements />} />
            <Route
              path="/analytics"
              element={
                current.role === 'Руководитель' ? <AnalyticsPage /> : <Navigate to={home} replace />
              }
            />
            <Route
              path="/routing"
              element={
                current.role === 'Администратор' ? <RoutingPage /> : <Navigate to={home} replace />
              }
            />
            <Route
              path="/users"
              element={
                current.role === 'Администратор' ? <UsersPage /> : <Navigate to={home} replace />
              }
            />
            <Route
              path="*"
              element={
                <div className="empty">
                  <ListFilter />
                  <h1>Страница не найдена</h1>
                  <NavLink to={home}>Вернуться в рабочее пространство</NavLink>
                </div>
              }
            />
          </Routes>
        </main>
        <footer className="footer">
          <span>Сигнал · Система внутренних улучшений</span>
          <span>ГК «Модус Трейд»</span>
        </footer>
      </div>
      {notice && (
        <div className="toast" role="status">
          <CheckCheck size={18} />
          {notice}
          <button
            className="icon-button"
            aria-label="Скрыть уведомление"
            onClick={() => notify('')}
          >
            <X size={15} />
          </button>
        </div>
      )}
      {reset && (
        <Modal
          title="Сбросить демо-данные?"
          onClose={() => {
            if (!busy) setReset(false);
          }}
        >
          <p>
            Будут восстановлены 60 исходных обращений и правила маршрутизации. Созданные обращения,
            комментарии и изменения будут удалены.
          </p>
          <ErrorMessage text={error} />
          <div className="button-row">
            <button disabled={busy} onClick={() => setReset(false)}>
              Отмена
            </button>
            <button
              className="primary"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await resetDemo();
                  await refresh();
                  setReset(false);
                  notify('Демо-данные восстановлены');
                  navigate(home);
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              Восстановить данные
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
