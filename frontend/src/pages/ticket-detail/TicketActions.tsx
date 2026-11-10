import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wand2 } from 'lucide-react';
import { draftResponse, reassign, updateStatus } from '../../api';
import { useApp } from '../../store';
import type { Status, Ticket } from '../../types';

import { Field, Panel } from '../../components/ui';
import type { ActionRunner } from './types';
export function TicketActions({ t, run, busy }: { t: Ticket; run: ActionRunner; busy: boolean }) {
  const { catalog, userId } = useApp();
  const id = t.id;
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>('В работе');
  const [actionText, setActionText] = useState('');
  const [assignee, setAssignee] = useState(t.assigneeId);
  const [reason, setReason] = useState('');
  const [draft, setDraft] = useState('');
  return (
    <Panel title="Действия ответственного">
      <div className="panel-body">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run(async () => {
              await updateStatus(id, status, actionText, userId);
              setActionText('');
              setDraft('');
            }, 'Статус и история обновлены');
          }}
        >
          <Field label="Новый статус">
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as Status);
                setDraft('');
              }}
            >
              {(
                [
                  'На рассмотрении',
                  'В работе',
                  'Ожидает уточнения',
                  'Реализовано',
                  'Отклонено',
                ] as Status[]
              ).map((s) => (
                <option disabled={s === t.status} key={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
          {status === 'Отклонено' && (
            <Field label="Шаблон мотивировки">
              <select
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) setActionText(e.target.value);
                }}
              >
                <option value="">Выберите шаблон</option>
                <option>
                  Сейчас нет подходящего помещения. Вернёмся к вопросу при перепланировке рабочих
                  помещений.
                </option>
                <option>
                  Реализация требует ресурсов, которые не предусмотрены в текущем плане. Повторно
                  рассмотрим предложение в следующем квартале.
                </option>
                <option>
                  Предложенное изменение не соответствует обязательным требованиям безопасности.
                  Предлагаем обсудить альтернативное решение.
                </option>
              </select>
            </Field>
          )}
          <Field
            label={
              status === 'Реализовано'
                ? 'Что изменилось *'
                : status === 'Отклонено'
                  ? 'Мотивировка отказа *'
                  : status === 'Ожидает уточнения'
                    ? 'Что нужно уточнить *'
                    : 'Комментарий к действию'
            }
          >
            <textarea
              rows={5}
              value={actionText}
              onChange={(e) => setActionText(e.target.value)}
              required={['Реализовано', 'Отклонено', 'Ожидает уточнения'].includes(status)}
              minLength={
                ['Реализовано', 'Отклонено', 'Ожидает уточнения'].includes(status) ? 10 : undefined
              }
            />
          </Field>
          <button
            type="button"
            className="text-button"
            disabled={busy}
            onClick={() =>
              run(
                async () => setDraft(await draftResponse(id, status, userId)),
                'Черновик подготовлен. Проверьте и отредактируйте текст.',
              )
            }
          >
            <Wand2 size={15} />
            Черновик ответа
          </button>
          {draft && (
            <div className="system-box">
              <span className="quiet-label">Автоподсказка</span>
              <p className="small">{draft}</p>
              <div className="button-row">
                <button
                  type="button"
                  onClick={() => {
                    setActionText(draft);
                    setDraft('');
                  }}
                >
                  Принять
                </button>
                <button type="button" onClick={() => setDraft('')}>
                  Отклонить
                </button>
              </div>
            </div>
          )}
          <button
            className="primary full-width"
            disabled={
              busy ||
              status === t.status ||
              (['Реализовано', 'Отклонено', 'Ожидает уточнения'].includes(status) &&
                actionText.trim().length < 10)
            }
          >
            Сохранить решение
          </button>
        </form>
        <hr />
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run(async () => {
              await reassign(id, assignee, reason, userId);
              setReason('');
              navigate('/inbox');
            }, 'Обращение переназначено');
          }}
        >
          <h3>Переназначить</h3>
          <Field label="Новый ответственный">
            <select value={assignee} onChange={(e) => setAssignee(e.target.value)}>
              {catalog!.users
                .filter((u) => u.role === 'Руководитель')
                .map((u) => (
                  <option key={u.id} value={u.id} disabled={u.vacation}>
                    {u.name}
                    {u.vacation ? ' · в отпуске' : ''}
                  </option>
                ))}
            </select>
          </Field>
          <Field label="Причина переназначения *">
            <textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              minLength={10}
            />
          </Field>
          <button disabled={busy || assignee === t.assigneeId || reason.trim().length < 10}>
            Переназначить
          </button>
        </form>
      </div>
    </Panel>
  );
}
