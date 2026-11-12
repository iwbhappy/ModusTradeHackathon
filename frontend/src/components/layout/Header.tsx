import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronsUpDown, Search } from 'lucide-react';
import { useApp } from '../../store';
import { Notifications } from './Notifications';
import { DesignToggle } from '../../themes/design';

import type { Role } from '../../types';
export function Header({ home }: { home: string }) {
  const { catalog, userId, selectRole, selectUser } = useApp();
  const current = catalog!.users.find((u) => u.id === userId)!;
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const switchRole = async (role: Role) => {
    setBusy(true);
    setError('');
    try {
      await selectRole(role);
      navigate(role === 'Сотрудник' ? '/mine' : role === 'Руководитель' ? '/inbox' : '/routing');
      setSearch('');
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <header className="topbar" title="Демо-вход. В промышленной версии — SSO через Битрикс24 / AD">
      {error && (
        <span className="login-error" role="alert">
          {error}
        </span>
      )}
      <form
        className="global-search"
        onSubmit={(e) => {
          e.preventDefault();
          navigate(
            `${current.role === 'Администратор' ? '/users' : home}?search=${encodeURIComponent(search)}`,
          );
        }}
      >
        <Search size={17} />
        <input
          aria-label={current.role === 'Администратор' ? 'Поиск пользователей' : 'Поиск обращений'}
          placeholder={
            current.role === 'Администратор'
              ? 'Найти пользователя по роли или подразделению'
              : 'Найти обращение по тексту или ID'
          }
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <kbd>Enter</kbd>
      </form>
      <div className="demo-role">
        <span className="demo-login-label">
          Демо-вход<small>В промышленной версии — SSO через Битрикс24 / AD</small>
        </span>
        <select
          aria-label="Демо-роль"
          value={current.role}
          disabled={busy}
          onChange={(e) => switchRole(e.target.value as Role)}
        >
          <option>Сотрудник</option>
          <option>Руководитель</option>
          <option>Администратор</option>
        </select>
      </div>
      <Notifications key={userId} />
      <DesignToggle />
      <div className="user-select">
        <span className="avatar">
          {current.role === 'Администратор' ? 'АС' : current.department.slice(0, 2).toUpperCase()}
        </span>
        <select
          aria-label="Текущий пользователь"
          value={userId}
          disabled={busy}
          onChange={async (e) => {
            setBusy(true);
            setError('');
            try {
              await selectUser(e.target.value);
              setSearch('');
              navigate(home);
            } catch (error) {
              setError((error as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          {catalog!.users
            .filter((u) => u.role === current.role)
            .map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
        </select>
        <ChevronsUpDown size={13} />
      </div>
    </header>
  );
}
