import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, ShieldCheck, Users } from 'lucide-react';
import { setVacation } from '../api';
import { useApp } from '../store';

import { ErrorMessage, PageTitle, Panel } from '../components/ui';
export function UsersPage() {
  const [params] = useSearchParams();
  const { catalog, userId, refresh, notify } = useApp();
  const [department, setDepartment] = useState('');
  const [role, setRole] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (!catalog) return null;
  const search = params.get('search')?.toLowerCase() || '';
  const filtered = catalog.users.filter(
    (u) =>
      (!department || department === u.department) &&
      (!role || role === u.role) &&
      (!search || `${u.name} ${u.department} ${u.role} ${u.id}`.toLowerCase().includes(search)),
  );
  return (
    <>
      <PageTitle
        title="Пользователи и роли"
        subtitle="Демонстрационные пользователи обозначены ролями и подразделениями"
      />
      <Panel title="Матрица доступа" aside={<ShieldCheck size={17} />}>
        <div className="access-grid">
          {[
            [
              'Сотрудник',
              'Свои обращения и те, к которым присоединился. Подача, комментарии и подтверждение своего результата.',
            ],
            [
              'Ответственный',
              'Личные назначения. Статусы, уточнения, решения и переназначение проверяются сервером.',
            ],
            [
              'Руководитель',
              'Назначения своего подразделения и обращения своих сотрудников в другие отделы (только чтение). Аналитика по области доступа; вся компания — у руководителя направления.',
            ],
            [
              'Администратор',
              'Все обращения целиком, вложения, аналитика компании и переназначение. Настройки и пользователи. Статусы, отказ и реализация остаются за ответственным.',
            ],
          ].map(([name, description]) => (
            <div key={name}>
              <h3>{name}</h3>
              <p>{description}</p>
            </div>
          ))}
        </div>
        <div className="table-footer">
          <span>
            Всем ролям доступны итоговые улучшения в «Сделано»; похожие обращения показываются
            сотруднику при подаче.
          </span>
        </div>
      </Panel>
      <Panel title="Пользователи" aside={<Users size={17} />}>
        <div className="filters">
          <select
            aria-label="Фильтр пользователей по подразделению"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
          >
            <option value="">Все подразделения</option>
            {catalog.departments.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
          <select
            aria-label="Фильтр пользователей по роли"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="">Все роли</option>
            {['Сотрудник', 'Руководитель', 'Администратор'].map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
          <span className="quiet-label">Показано {filtered.length}</span>
        </div>
        <ErrorMessage text={error} />
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Пользователь</th>
                <th>Подразделение</th>
                <th>Роль</th>
                <th>Доступность</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id}>
                  <td>
                    <strong>{u.name}</strong>
                    <small className="mono">{u.id}</small>
                  </td>
                  <td>{u.department}</td>
                  <td>{u.role}</td>
                  <td>
                    {u.role === 'Руководитель' ? (
                      <button
                        role="switch"
                        aria-checked={u.vacation}
                        className="vacation-switch"
                        disabled={busy}
                        onClick={async () => {
                          setBusy(true);
                          setError('');
                          try {
                            await setVacation(u.id, !u.vacation, userId);
                            await refresh();
                            notify(`${u.name}: ${u.vacation ? 'доступен' : 'в отпуске'}`);
                          } catch (e) {
                            setError((e as Error).message);
                          } finally {
                            setBusy(false);
                          }
                        }}
                      >
                        <span className={`switch-track ${u.vacation ? 'on' : ''}`}>
                          <i />
                        </span>
                        {u.vacation ? 'В отпуске' : 'Доступен'}
                      </button>
                    ) : (
                      <span className="muted">Доступен</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      <Link to="/routing" className="text-button">
        Проверить правила назначения
        <ArrowRight size={15} />
      </Link>
    </>
  );
}
