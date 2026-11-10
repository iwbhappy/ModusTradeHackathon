import { useEffect, useState } from 'react';
import { Navigate, NavLink, Route, Routes, useNavigate } from 'react-router-dom';
import { Activity, ArrowUpRight, ChartNoAxesCombined, CheckCheck, ChevronsUpDown, CircleHelp, Inbox, ListFilter, Plus, RotateCcw, Search, Settings2, ShieldCheck, Users, X } from 'lucide-react';
import { useApp } from './store';
import { resetDemo } from './api';
import { ErrorMessage, Loading, Modal } from './components/ui';
import { TicketList } from './pages/TicketList';
import { NewTicket } from './pages/NewTicket';
import { TicketDetail } from './pages/TicketDetail';
import { Improvements } from './pages/Improvements';
import { AnalyticsPage } from './pages/Analytics';
import { RoutingPage, UsersPage } from './pages/Admin';
import type { Role } from './types';

export default function App() {
  const { catalog, userId, load, selectRole, selectUser, notice, notify, refresh } = useApp();
  const navigate = useNavigate(); const [search, setSearch] = useState(''); const [reset, setReset] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  useEffect(() => { load().catch(e => setError(String(e))); }, [load]);
  useEffect(() => { if (!notice) return; const timer = setTimeout(() => notify(''), 5500); return () => clearTimeout(timer); }, [notice, notify]);
  if (!catalog) return error ? <ErrorMessage text={error}/> : <Loading/>;
  const current = catalog.users.find(u => u.id === userId)!;
  const home = current.role === 'Сотрудник' ? '/mine' : current.role === 'Руководитель' ? '/inbox' : '/routing';
  const switchRole = (role: Role) => { selectRole(role); navigate(role === 'Сотрудник' ? '/mine' : role === 'Руководитель' ? '/inbox' : '/routing'); setSearch(''); };
  return <div className="app-shell">
    <aside className="sidebar"><NavLink to={home} className="brand"><span className="brand-mark"><Activity size={23}/></span><span>СИГНАЛ<small>МОДУС ТРЕЙД</small></span></NavLink><div className="workspace-label">РАБОЧЕЕ ПРОСТРАНСТВО</div><nav aria-label="Основная навигация">
      {current.role === 'Сотрудник' && <><NavLink to="/mine"><Inbox/>Мои обращения</NavLink><NavLink to="/new"><Plus/>Новое обращение</NavLink></>}
      {current.role === 'Руководитель' && <><NavLink to="/inbox"><Inbox/>Входящие</NavLink><NavLink to="/analytics"><ChartNoAxesCombined/>Аналитика</NavLink></>}
      {current.role === 'Администратор' && <><NavLink to="/routing"><Settings2/>Маршрутизация</NavLink><NavLink to="/users"><Users/>Пользователи и роли</NavLink></>}
      <NavLink to="/done"><CheckCheck/>Сделано<ArrowUpRight className="nav-end"/></NavLink>
    </nav><div className="sidebar-bottom"><div className="security-note"><ShieldCheck size={17}/><div>Внутренний контур<small>Обращение не потеряется</small></div></div><button onClick={() => { setError(''); setReset(true); }}><RotateCcw size={15}/>Сбросить демо-данные</button><span className="version">ДЕМО-ПРОТОТИП · ЭТАП 01</span></div></aside>
    <div className="app-content"><header className="topbar"><form className="global-search" onSubmit={e => { e.preventDefault(); navigate(`${current.role === 'Администратор' ? '/users' : home}?search=${encodeURIComponent(search)}`); }}><Search size={17}/><input aria-label={current.role === 'Администратор' ? 'Поиск пользователей' : 'Поиск обращений'} placeholder={current.role === 'Администратор' ? 'Найти пользователя по роли или подразделению' : 'Найти обращение по тексту или ID'} value={search} onChange={e => setSearch(e.target.value)}/><kbd>Enter</kbd></form><div className="demo-role"><span>Демо-роль</span><select aria-label="Демо-роль" value={current.role} onChange={e => switchRole(e.target.value as Role)}><option>Сотрудник</option><option>Руководитель</option><option>Администратор</option></select></div><div className="user-select"><span className="avatar">{current.role === 'Администратор' ? 'АС' : current.department.slice(0, 2).toUpperCase()}</span><select aria-label="Текущий пользователь" value={userId} onChange={e => { selectUser(e.target.value); setSearch(''); navigate(home); }}>{catalog.users.filter(u => u.role === current.role).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</select><ChevronsUpDown size={13}/></div></header>
    <main key={userId}><div className="breadcrumb"><span>Модус Трейд</span><span>/</span><span>Обратная связь сотрудников</span><div className="prototype-label"><CircleHelp size={13}/>Демонстрационные данные</div></div><Routes>
      <Route path="/" element={<Navigate to={home} replace/>}/>
      <Route path="/mine" element={current.role === 'Сотрудник' ? <TicketList mode="mine"/> : <Navigate to={home} replace/>}/>
      <Route path="/new" element={current.role === 'Сотрудник' ? <NewTicket/> : <Navigate to={home} replace/>}/>
      <Route path="/inbox" element={current.role === 'Руководитель' ? <TicketList mode="inbox"/> : <Navigate to={home} replace/>}/>
      <Route path="/tickets/:id" element={<TicketDetail/>}/>
      <Route path="/done" element={<Improvements/>}/>
      <Route path="/analytics" element={current.role === 'Руководитель' ? <AnalyticsPage/> : <Navigate to={home} replace/>}/>
      <Route path="/routing" element={current.role === 'Администратор' ? <RoutingPage/> : <Navigate to={home} replace/>}/>
      <Route path="/users" element={current.role === 'Администратор' ? <UsersPage/> : <Navigate to={home} replace/>}/>
      <Route path="*" element={<div className="empty"><ListFilter/><h1>Страница не найдена</h1><NavLink to={home}>Вернуться в рабочее пространство</NavLink></div>}/>
    </Routes></main><footer className="footer"><span>Сигнал · Система внутренних улучшений</span><span>ГК «Модус Трейд»</span></footer></div>
    {notice && <div className="toast" role="status"><CheckCheck size={18}/>{notice}<button className="icon-button" aria-label="Скрыть уведомление" onClick={() => notify('')}><X size={15}/></button></div>}
    {reset && <Modal title="Сбросить демо-данные?" onClose={() => { if (!busy) setReset(false); }}><p>Будут восстановлены 60 исходных обращений и правила маршрутизации. Созданные обращения, комментарии и изменения будут удалены.</p><ErrorMessage text={error}/><div className="button-row"><button disabled={busy} onClick={() => setReset(false)}>Отмена</button><button className="primary" disabled={busy} onClick={async () => { setBusy(true); try { await resetDemo(); await refresh(); setReset(false); notify('Демо-данные восстановлены'); navigate(home); } catch (e) { setError((e as Error).message); } finally { setBusy(false); } }}>Восстановить данные</button></div></Modal>}
  </div>;
}
