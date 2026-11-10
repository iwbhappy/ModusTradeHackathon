import { NavLink } from 'react-router-dom';
import {
  Activity,
  ArrowUpRight,
  ChartNoAxesCombined,
  CheckCheck,
  Inbox,
  Plus,
  RotateCcw,
  Settings2,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { useApp } from '../../store';

export function Sidebar({ home, onReset }: { home: string; onReset: () => void }) {
  const { catalog, userId } = useApp();
  const current = catalog!.users.find((u) => u.id === userId)!;
  return (
    <aside className="sidebar">
      <NavLink to={home} className="brand">
        <span className="brand-mark">
          <Activity size={23} />
        </span>
        <span>
          СИГНАЛ<small>МОДУС ТРЕЙД</small>
        </span>
      </NavLink>
      <div className="workspace-label">РАБОЧЕЕ ПРОСТРАНСТВО</div>
      <nav aria-label="Основная навигация">
        {current.role === 'Сотрудник' && (
          <>
            <NavLink to="/mine">
              <Inbox />
              Мои обращения
            </NavLink>
            <NavLink to="/new">
              <Plus />
              Новое обращение
            </NavLink>
          </>
        )}
        {current.role === 'Руководитель' && (
          <>
            <NavLink to="/inbox">
              <Inbox />
              Входящие
            </NavLink>
            <NavLink to="/analytics">
              <ChartNoAxesCombined />
              Аналитика
            </NavLink>
          </>
        )}
        {current.role === 'Администратор' && (
          <>
            <NavLink to="/routing">
              <Settings2 />
              Маршрутизация
            </NavLink>
            <NavLink to="/users">
              <Users />
              Пользователи и роли
            </NavLink>
          </>
        )}
        <NavLink to="/done">
          <CheckCheck />
          Сделано
          <ArrowUpRight className="nav-end" />
        </NavLink>
      </nav>
      <div className="sidebar-bottom">
        <div className="security-note">
          <ShieldCheck size={17} />
          <div>
            Внутренний контур<small>Обращение не потеряется</small>
          </div>
        </div>
        <button onClick={onReset}>
          <RotateCcw size={15} />
          Сбросить демо-данные
        </button>
        <span className="version">ДЕМО-ПРОТОТИП · ЭТАП 01</span>
      </div>
    </aside>
  );
}
