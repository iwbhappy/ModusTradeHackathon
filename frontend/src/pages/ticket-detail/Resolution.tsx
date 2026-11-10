import { useState } from 'react';

import { CheckCheck, CornerUpLeft } from 'lucide-react';
import { confirmResolution } from '../../api';
import { useApp } from '../../store';
import type { Ticket } from '../../types';

import { Field, Panel } from '../../components/ui';
import type { ActionRunner } from './types';
export function Resolution({ t, run, busy }: { t: Ticket; run: ActionRunner; busy: boolean }) {
  const { userId } = useApp();
  const id = t.id;
  const author = t.authorId === userId;
  const [returning, setReturning] = useState(false);
  const [returnReason, setReturnReason] = useState('');
  return (
    <Panel title="Что изменилось" aside={<CheckCheck size={17} />}>
      <div className="panel-body">
        <p>{t.changed}</p>
        {t.confirmed && (
          <div className="success-line">
            <CheckCheck size={16} />
            Результат подтверждён автором
          </div>
        )}
        {author && t.status === 'Реализовано' && (
          <div className="confirmation">
            <p>
              <strong>Проверьте результат в своей работе</strong>
            </p>
            <div className="button-row">
              <button
                className="primary"
                disabled={busy}
                onClick={() =>
                  run(
                    () => confirmResolution(id, true, '', userId),
                    'Решение подтверждено. Обращение закрыто.',
                  )
                }
              >
                <CheckCheck size={16} />
                Проблема решена
              </button>
              <button disabled={busy} onClick={() => setReturning(!returning)}>
                <CornerUpLeft size={16} />
                Не решена — вернуть
              </button>
            </div>
            {returning && (
              <div className="return-form">
                <Field label="Что осталось нерешённым? *">
                  <textarea
                    rows={3}
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value)}
                  />
                </Field>
                <button
                  disabled={busy || returnReason.trim().length < 10}
                  onClick={() =>
                    run(
                      () => confirmResolution(id, false, returnReason, userId),
                      'Обращение возвращено в работу. Срок обновлён.',
                    )
                  }
                  className="primary"
                >
                  Вернуть ответственному
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </Panel>
  );
}
