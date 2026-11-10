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
  FileText,
} from 'lucide-react';
import { useApp } from '../../store';
import type { ReactNode } from 'react';

function MenuItem({
  to,
  label,
  icon,
  end = false,
}: {
  to: string;
  label: string;
  icon: ReactNode;
  end?: boolean;
}) {
  return (
    <NavLink to={to} aria-label={label}>
      {icon}
      <span className="nav-label">{label}</span>
      {end && <ArrowUpRight className="nav-end" />}
    </NavLink>
  );
}

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
        {current.role !== 'Сотрудник' && (
          <MenuItem to="/report" label="Отчёт" icon={<FileText />} />
        )}
        {current.role === 'Сотрудник' && (
          <>
            <MenuItem to="/mine" label="Мои обращения" icon={<Inbox />} />
            <MenuItem to="/new" label="Новое обращение" icon={<Plus />} />
          </>
        )}
        {current.role === 'Руководитель' && (
          <>
            <MenuItem to="/inbox" label="Входящие" icon={<Inbox />} />
            <MenuItem to="/analytics" label="Аналитика" icon={<ChartNoAxesCombined />} />
          </>
        )}
        {current.role === 'Администратор' && (
          <>
            <MenuItem to="/all" label="Все обращения" icon={<Inbox />} />
            <MenuItem to="/analytics" label="Аналитика" icon={<ChartNoAxesCombined />} />
            <MenuItem to="/routing" label="Маршрутизация" icon={<Settings2 />} />
            <MenuItem to="/users" label="Пользователи и роли" icon={<Users />} />
          </>
        )}
        <MenuItem to="/done" label="Сделано" icon={<CheckCheck />} end />
      </nav>
      <div className="sidebar-bottom">
        <div className="security-note">
          <ShieldCheck size={17} />
          <div>
            Внутренний контур<small>Обращение не потеряется</small>
          </div>
        </div>
        <button
          onClick={onReset}
          disabled={current.role !== 'Администратор'}
          title="Сброс демо-данных доступен администратору"
        >
          <RotateCcw size={15} />
          Сбросить демо-данные
        </button>
        <span className="version">MVP · ДЕМО-ДАННЫЕ</span>
      </div>
    </aside>
  );
}
