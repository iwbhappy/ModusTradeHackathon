import { ShieldAlert, ShieldCheck } from 'lucide-react';
import type { JournalIntegrity, Ticket } from '../../types';
import { date } from '../../lib/format';
import { Panel } from '../../components/ui';

/** Статус цепочки подписей: журнал нельзя незаметно изменить задним числом. */
function Integrity({ value }: { value: JournalIntegrity }) {
  if (!value.valid) {
    return (
      <div className="journal-integrity broken" role="alert">
        <ShieldAlert size={16} />
        <p>
          <b>Целостность журнала нарушена.</b> Запись №{value.brokenAt} изменена или удалена в обход
          системы. Сообщите администратору.
        </p>
      </div>
    );
  }
  return (
    <div className="journal-integrity">
      <ShieldCheck size={16} />
      <p>
        Журнал защищён от изменений: {value.count} записей, цепочка подписей проверена.
        <span className="mono" title={value.lastHash}>
          {value.lastHash.slice(0, 12)}
        </span>
      </p>
    </div>
  );
}

export function History({ t }: { t: Ticket }) {
  return (
    <Panel title="История событий">
      {t.integrity && <Integrity value={t.integrity} />}
      <ol className="event-history">
        {[...t.events].reverse().map((e) => (
          <li key={e.id}>
            <span className="history-dot" />
            <div>
              <div className="between">
                <strong>{e.actor}</strong>
                <time>{date(e.date)}</time>
              </div>
              <p>{e.text}</p>
            </div>
          </li>
        ))}
      </ol>
    </Panel>
  );
}
