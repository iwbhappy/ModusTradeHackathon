import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronsUpDown, Search } from 'lucide-react';
import { useApp } from '../../store';

import type { Role } from '../../types';
export function Header({ home }: { home: string }) {
  const { catalog, userId, selectRole, selectUser } = useApp();
  const current = catalog!.users.find((u) => u.id === userId)!;
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const switchRole = (role: Role) => {
    selectRole(role);
    navigate(role === 'Сотрудник' ? '/mine' : role === 'Руководитель' ? '/inbox' : '/routing');
    setSearch('');
  };
  return (
    <header className="topbar">
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
        <span>Демо-роль</span>
        <select
          aria-label="Демо-роль"
          value={current.role}
          onChange={(e) => switchRole(e.target.value as Role)}
        >
          <option>Сотрудник</option>
          <option>Руководитель</option>
          <option>Администратор</option>
        </select>
      </div>
      <div className="user-select">
        <span className="avatar">
          {current.role === 'Администратор' ? 'АС' : current.department.slice(0, 2).toUpperCase()}
        </span>
        <select
          aria-label="Текущий пользователь"
          value={userId}
          onChange={(e) => {
            selectUser(e.target.value);
            setSearch('');
            navigate(home);
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
