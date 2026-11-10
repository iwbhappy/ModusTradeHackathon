import { useState } from 'react';
import type { RoutePreview, User } from '../../types';
import { ErrorMessage, Field, Loading } from '../../components/ui';
import { RoutingPreview } from './RoutingPreview';

export function RecipientField({
  route,
  error,
  users,
  selectedId,
  onSelect,
  busy,
}: {
  route: RoutePreview | null;
  error: string;
  users: User[];
  selectedId?: string;
  onSelect: (id: string) => void;
  busy: boolean;
}) {
  const [editing, setEditing] = useState(false);
  return (
    <section className="recipient-field">
      <h3>Получатель</h3>
      <ErrorMessage text={error} />
      {route ? <RoutingPreview route={route} /> : !error && <Loading />}
      {selectedId && (
        <p className="small muted">
          Получатель выбран вручную; сроки остаются по правилу категории.
        </p>
      )}
      <div className="button-row">
        <button
          type="button"
          disabled={busy || !route}
          onClick={() => setEditing((value) => !value)}
        >
          Изменить получателя
        </button>
        {selectedId && (
          <button type="button" disabled={busy} onClick={() => onSelect('')}>
            Вернуть по правилу
          </button>
        )}
      </div>
      {editing && (
        <Field label="Руководитель — получатель обращения">
          <select
            value={selectedId || ''}
            disabled={busy}
            onChange={(event) => onSelect(event.target.value)}
          >
            <option value="">По правилу категории</option>
            {users
              .filter((user) => user.role === 'Руководитель')
              .map((user) => (
                <option key={user.id} value={user.id} disabled={user.vacation}>
                  {user.name} · {user.department}
                  {user.vacation ? ' · в отпуске' : ''}
                </option>
              ))}
          </select>
        </Field>
      )}
    </section>
  );
}
