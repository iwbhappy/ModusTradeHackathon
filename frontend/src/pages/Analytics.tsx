import { SlaPanel } from './analytics/SlaPanel';
import { ClustersTable } from './analytics/ClustersTable';
import { FrictionMatrix } from './analytics/FrictionMatrix';
import { Kpis } from './analytics/Kpis';
import { Drilldown } from './analytics/Drilldown';
import { Distribution } from './analytics/Distribution';
import { WeeklyChart } from './analytics/WeeklyChart';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChartNoAxesCombined } from 'lucide-react';
import { getAnalytics } from '../api';
import { useApp } from '../store';
import type { Analytics, Ticket } from '../types';

import { ErrorMessage, Loading, PageTitle, Panel } from '../components/ui';

export function AnalyticsPage() {
  const { userId } = useApp();
  const [params, setParams] = useSearchParams();
  const [days, setDays] = useState(90);
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [drill, setDrill] = useState<{ title: string; tickets: Ticket[] } | null>(null);
  useEffect(() => {
    let live = true;
    setLoading(true);
    getAnalytics(days, userId)
      .then((result) => {
        if (live) {
          setData(result);
          const cluster = params.get('cluster');
          if (cluster)
            setDrill({
              title: result.clusters.find((c) => c.id === cluster)?.title || 'Кластер',
              tickets: result.tickets.filter((t) => t.clusterId === cluster),
            });
        }
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
  }, [days, userId, params]);
  if (!data && loading) return <Loading />;
  if (!data) return <ErrorMessage text={error} />;
  const tickets = data.tickets;
  const group = (key: 'type' | 'status' | 'category') =>
    [...new Set(tickets.map((t) => t[key]))]
      .map((label) => ({ label, value: tickets.filter((t) => t[key] === label).length }))
      .sort((a, b) => b.value - a.value);
  const show = (title: string, list: Ticket[]) => setDrill({ title, tickets: list });
  return (
    <>
      <PageTitle
        title="Аналитика обращений"
        subtitle="Повторяющиеся проблемы, потери времени и результат изменений · вся компания"
        action={
          <div className="segmented compact">
            {[
              [30, '30 дней'],
              [90, '90 дней'],
              [0, 'Всё время'],
            ].map(([value, label]) => (
              <button
                key={value}
                className={days === value ? 'selected' : ''}
                onClick={() => {
                  setDays(Number(value));
                  setDrill(null);
                }}
              >
                {label}
              </button>
            ))}
          </div>
        }
      />
      <ErrorMessage text={error} />
      {loading && <Loading />}
      <Kpis data={data} />
      <div className="analytics-top">
        <Panel
          title="Динамика по неделям"
          aside={
            <div className="chart-legend">
              <span>
                <i />
                Новые
              </span>
              <span>
                <i />
                Реализовано
              </span>
            </div>
          }
        >
          <WeeklyChart tickets={tickets} />
        </Panel>
        <SlaPanel data={data} show={show} />
      </div>
      <div className="distribution-grid">
        <Distribution title="По типам" data={group('type')} />
        <Distribution title="По статусам" data={group('status')} />
        <Distribution title="По категориям" data={group('category')} limit={7} />
      </div>
      <ClustersTable data={data} show={show} />
      <FrictionMatrix data={data} show={show} />
      <div className="analytics-note">
        <ChartNoAxesCombined size={16} />
        <span>
          За период: {tickets.length} обращений по дате создания. Тренд всегда сравнивает последние
          30 дней с предыдущими 30 по всей истории, независимо от фильтра.
        </span>
      </div>
      {drill && (
        <Drilldown
          drill={drill}
          onClose={() => {
            setDrill(null);
            if (params.has('cluster')) setParams({});
          }}
        />
      )}
    </>
  );
}
