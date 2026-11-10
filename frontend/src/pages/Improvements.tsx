import { useEffect, useState } from 'react';
import { CheckCheck, MoveRight, Users } from 'lucide-react';
import { getImprovements } from '../api';
import { useApp } from '../store';
import type { Ticket } from '../types';
import { date } from '../lib/format';
import { Badge, Empty, ErrorMessage, Loading, PageTitle, Panel } from '../components/ui';

export function Improvements() {
  const { catalog, revision } = useApp();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [department, setDepartment] = useState('');
  useEffect(() => {
    let live = true;
    getImprovements()
      .then((t) => {
        if (live) setTickets(t);
      })
      .catch((e) => {
        if (live) setError(e.message);
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [revision]);
  if (!catalog) return null;
  const filtered = tickets.filter((t) => !department || t.targetDepartment === department);
  return (
    <>
      <PageTitle
        title="Сделано"
        subtitle="Предложения сотрудников, которые изменили повседневную работу"
        action={
          <select
            aria-label="Подразделение улучшения"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
          >
            <option value="">Все подразделения</option>
            {catalog.departments.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        }
      />
      <div className="done-intro">
        <CheckCheck size={22} />
        <div>
          <strong>{tickets.length} улучшений с зафиксированным результатом</strong>
          <p>Спасибо сотрудникам, которые помогают улучшать процессы.</p>
        </div>
      </div>
      <ErrorMessage text={error} />
      {loading ? (
        <Loading />
      ) : !filtered.length ? (
        <Empty text="Улучшений по выбранному подразделению пока нет" />
      ) : (
        <div className="improvements-feed">
          {filtered.map((t) => (
            <Panel key={t.id}>
              <div className="improvement-top">
                <span className="mono ticket-id">{t.id}</span>
                <span>{t.targetDepartment}</span>
                <time>{date(t.implementedAt!)}</time>
              </div>
              <div className="panel-body">
                <h2>{t.title}</h2>
                <div className="before-after">
                  <div>
                    <span className="eyebrow">БЫЛО</span>
                    <p>{t.text}</p>
                  </div>
                  <MoveRight size={20} />
                  <div>
                    <span className="eyebrow steel">СТАЛО</span>
                    <p>{t.changed}</p>
                  </div>
                </div>
                <div className="improvement-footer">
                  <span>
                    <Users size={15} />
                    Затронуто: {t.participants.length + 1} чел. · Спасибо:{' '}
                    {catalog.users.find((u) => u.id === t.authorId)?.name}
                  </span>
                  {t.confirmed ? (
                    <Badge status="Подтверждено автором" />
                  ) : t.defaultConfirmed ? (
                    <span className="quiet-label">Подтверждено по умолчанию</span>
                  ) : (
                    <span className="quiet-label">Ожидает проверки автором</span>
                  )}
                </div>
              </div>
            </Panel>
          ))}
        </div>
      )}
    </>
  );
}
