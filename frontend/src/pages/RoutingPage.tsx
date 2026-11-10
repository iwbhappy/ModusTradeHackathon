import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Pencil, ShieldCheck } from 'lucide-react';
import { isMockMode, runSlaCheck, saveRule } from '../api';
import { useApp } from '../store';
import type { Rule } from '../types';
import { ErrorMessage, Field, Modal, PageTitle, Panel } from '../components/ui';
export function RoutingPage() {
  const { catalog, userId, refresh, notify } = useApp();
  const [editing, setEditing] = useState<Rule | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (!catalog) return null;
  const name = (id: string) => catalog.users.find((u) => u.id === id)?.name;
  return (
    <>
      <PageTitle
        title="Категории и маршрутизация"
        subtitle="Ответственные, резервное назначение и сроки рассмотрения"
        action={
          <button
            disabled={busy || isMockMode}
            title={isMockMode ? 'Нужен HTTP-режим' : 'Запустить SLA и эскалации сейчас'}
            onClick={async () => {
              setBusy(true);
              setError('');
              try {
                const result = await runSlaCheck(userId);
                const message =
                  result.message === 'Проверка уже выполняется'
                    ? result.message
                    : 'Проверка выполнена';
                notify(
                  `${message}. Новых событий: ${result.processed}. Сейчас эскалировано: ${result.summary.escalated}, просрочено: ${result.summary.overdue}`,
                );
                await refresh();
              } catch (error) {
                setError((error as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            Проверить SLA сейчас
          </button>
        }
      />
      <ErrorMessage text={error} />
      <div className="info-strip">
        <ShieldCheck size={19} />
        <div>
          <strong>Обращение всегда получит ответственного</strong>
          <p>
            Если основной в отпуске, система выберет резервного. Переключатель отпуска находится в
            разделе <Link to="/users">«Пользователи и роли»</Link>.
          </p>
        </div>
      </div>
      <Panel
        title="Правила назначения"
        aside={
          <span className="quiet-label">{catalog.rules.length} правил · сроки в рабочих днях</span>
        }
      >
        <div className="table-wrap">
          <table className="routing-table">
            <thead>
              <tr>
                <th>Категория / подразделение</th>
                <th>Основной ответственный</th>
                <th>Резервный ответственный</th>
                <th className="numeric">Первый ответ</th>
                <th className="numeric">Решение</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {catalog.rules.map((rule) => (
                <tr key={rule.id}>
                  <td>
                    <strong>{rule.category || 'Правило по умолчанию'}</strong>
                    <small>{rule.department || 'Все подразделения'}</small>
                  </td>
                  <td>
                    {name(rule.primaryId)}
                    {catalog.users.find((u) => u.id === rule.primaryId)?.vacation && (
                      <span className="vacation-tag">В отпуске → резервный</span>
                    )}
                  </td>
                  <td>
                    {name(rule.backupId)}
                    {catalog.users.find((u) => u.id === rule.backupId)?.vacation && (
                      <span className="vacation-tag">В отпуске</span>
                    )}
                  </td>
                  <td className="numeric mono">{rule.responseDays} дн.</td>
                  <td className="numeric mono">{rule.resolutionDays} дн.</td>
                  <td>
                    <button
                      className="icon-button"
                      aria-label={`Редактировать правило: ${rule.category}`}
                      onClick={() => {
                        setEditing({ ...rule });
                        setError('');
                      }}
                    >
                      <Pencil size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      <div className="routing-explanation">
        <h2>Как выбирается маршрут</h2>
        <p>
          Сначала проверяется совпадение категории и подразделения. Затем — общее правило категории.
          Отпуск влияет на новые обращения; существующие назначения сохраняются. Если оба
          ответственных отсутствуют, форма подачи предлагает исправить правило.
        </p>
        <p>
          Для демонстрации: отправьте руководителя закупок в отпуск и создайте обращение в категории
          «Межотдельное взаимодействие».
        </p>
      </div>
      {editing && (
        <Modal
          title="Редактирование правила"
          onClose={() => {
            if (!busy) setEditing(null);
          }}
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError('');
              try {
                await saveRule(editing, userId);
                await refresh();
                setEditing(null);
                notify('Правило маршрутизации сохранено');
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <Field label="Категория">
              <select
                value={editing.category}
                onChange={(e) => setEditing({ ...editing, category: e.target.value })}
              >
                <option value="">Правило по умолчанию</option>
                {catalog.categories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </Field>
            <Field label="Подразделение проблемы">
              <select
                value={editing.department}
                onChange={(e) => setEditing({ ...editing, department: e.target.value })}
              >
                <option value="">Все подразделения</option>
                {catalog.departments.map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </select>
            </Field>
            {(['primaryId', 'backupId'] as const).map((key) => (
              <Field
                key={key}
                label={key === 'primaryId' ? 'Основной ответственный' : 'Резервный ответственный'}
              >
                <select
                  value={editing[key]}
                  onChange={(e) => setEditing({ ...editing, [key]: e.target.value })}
                >
                  {catalog.users
                    .filter((u) => u.role === 'Руководитель')
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                        {u.vacation ? ' · в отпуске' : ''}
                      </option>
                    ))}
                </select>
              </Field>
            ))}
            <div className="form-grid">
              <Field label="SLA первого ответа, раб. дней">
                <input
                  type="number"
                  min={1}
                  max={60}
                  required
                  value={editing.responseDays}
                  onChange={(e) => setEditing({ ...editing, responseDays: Number(e.target.value) })}
                />
              </Field>
              <Field label="SLA решения, раб. дней">
                <input
                  type="number"
                  min={editing.responseDays}
                  max={120}
                  required
                  value={editing.resolutionDays}
                  onChange={(e) =>
                    setEditing({ ...editing, resolutionDays: Number(e.target.value) })
                  }
                />
              </Field>
            </div>
            <ErrorMessage text={error} />
            <div className="button-row">
              <button type="button" disabled={busy} onClick={() => setEditing(null)}>
                Отмена
              </button>
              <button className="primary" disabled={busy}>
                Сохранить правило
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
