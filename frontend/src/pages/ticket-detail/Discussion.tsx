import { useState } from 'react';

import { MessageSquare, Send, UserRound } from 'lucide-react';
import { addComment } from '../../api';
import { useApp } from '../../store';
import type { Ticket } from '../../types';
import { date } from '../../lib/format';
import { Field, Panel } from '../../components/ui';
import type { ActionRunner } from './types';
export function Discussion({
  t,
  run,
  busy,
  readOnly = false,
}: {
  t: Ticket;
  run: ActionRunner;
  busy: boolean;
  readOnly?: boolean;
}) {
  const { userId } = useApp();
  const id = t.id;
  const author = t.authorId === userId;
  const [comment, setComment] = useState('');
  return (
    <Panel title="Обсуждение" aside={<span className="mono muted">{t.comments.length}</span>}>
      <div className="panel-body">
        {!t.comments.length && (
          <p className="muted">
            Комментариев пока нет.{!readOnly && ' Здесь можно уточнить контекст обращения.'}
          </p>
        )}
        {t.comments.map((c) => (
          <article className="comment" key={c.id}>
            <div className="comment-heading">
              <UserRound size={15} />
              <strong>{c.author}</strong>
              <time>{date(c.date)}</time>
            </div>
            <p className="preserve">{c.text}</p>
          </article>
        ))}
        {author && t.status === 'Ожидает уточнения' && (
          <div className="inline-attention">
            <MessageSquare size={16} />
            Ответьте на запрос. Обращение вернётся на рассмотрение.
          </div>
        )}
        {!readOnly && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              run(async () => {
                await addComment(id, comment, userId);
                setComment('');
              }, 'Комментарий сохранён');
            }}
          >
            <Field
              label={
                author && t.status === 'Ожидает уточнения'
                  ? 'Ответ на запрос уточнения'
                  : 'Новый комментарий'
              }
            >
              <textarea
                rows={3}
                placeholder="Добавьте информацию по обращению…"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                required
                maxLength={6000}
              />
            </Field>
            <button disabled={busy || !comment.trim()} className="primary">
              <Send size={15} />
              Отправить
            </button>
          </form>
        )}
      </div>
    </Panel>
  );
}
