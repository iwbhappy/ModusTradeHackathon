import { useApp } from '../../store';
import type { Ticket } from '../../types';

import { Panel } from '../../components/ui';

export function Participants({ t }: { t: Ticket }) {
  const { catalog } = useApp();
  return (
    <Panel
      title="Присоединились к обращению"
      aside={<span className="mono muted">{t.participants.length}</span>}
    >
      <div className="panel-body">
        {t.participants.map((p) => (
          <article className="participant" key={p.userId}>
            <strong>{catalog!.users.find((u) => u.id === p.userId)?.name}</strong>
            <small>{p.department}</small>
            <p>{p.context}</p>
          </article>
        ))}
      </div>
    </Panel>
  );
}
