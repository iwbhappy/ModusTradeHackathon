import type { Ticket } from '../../types';
import { date } from '../../lib/format';
import { Panel } from '../../components/ui';

export function History({ t }: { t: Ticket }) {
  return (
    <Panel title="История событий">
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
