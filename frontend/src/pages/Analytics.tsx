import { ClustersTable } from './analytics/ClustersTable';
import { EmergingProblems } from './analytics/EmergingProblems';
import { FrictionMatrix } from './analytics/FrictionMatrix';
import { Kpis } from './analytics/Kpis';
import { ManagerSummary } from './analytics/ManagerSummary';
import { Drilldown } from './analytics/Drilldown';
import { FunnelChart } from './analytics/FunnelChart';
import { DeadlineHealth } from './analytics/DeadlineHealth';
import { ProblemTreemap } from './analytics/ProblemTreemap';
import { WeeklyChart } from './analytics/WeeklyChart';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Building2, ChartNoAxesCombined, Download } from 'lucide-react';
import { exportAnalytics, getAnalytics, getAnalyticsTickets, isMockMode } from '../api';
import { useApp } from '../store';
import type { Analytics, AnalyticsFilters, Ticket } from '../types';

import { ErrorMessage, Loading, PageTitle } from '../components/ui';

export function AnalyticsPage() {
  const { userId, catalog, selectUser } = useApp();
  const [params, setParams] = useSearchParams();
  const [days, setDays] = useState(90);
  const [version, setVersion] = useState(0);
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [drill, setDrill] = useState<{ title: string; tickets: Ticket[] } | null>(null);
  useEffect(() => {
    let live = true;
    setLoading(true);
    getAnalytics(days, userId)
      .then(async (result) => {
        if (live) {
          setData(result);
          const cluster = params.get('cluster');
          if (cluster) {
            const tickets = await getAnalyticsTickets(days, { cluster }, userId);
            if (!live) return;
            setDrill({
              title: result.clusterStats.find((c) => c.id === cluster)?.title || 'Кластер',
              tickets,
            });
          }
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
  }, [days, userId, params, version]);
  if (!data && loading) return <Loading />;
  if (!data) return <ErrorMessage text={error} />;
  const show = async (title: string, filters: AnalyticsFilters) => {
    setError('');
    try {
      setDrill({ title, tickets: await getAnalyticsTickets(days, filters, userId) });
    } catch (error) {
      setError((error as Error).message);
    }
  };
  const companyViewer = catalog?.users.find((u) => u.canViewCompanyAnalytics);
  return (
    <>
      <PageTitle
        title="Аналитика обращений"
        subtitle={`Повторяющиеся проблемы и результат изменений · ${data.companyScope ? 'вся компания' : 'ваше подразделение'}`}
        action={
          <div className="button-row">
            <button
              disabled={isMockMode}
              onClick={() =>
                exportAnalytics(days, userId).catch((error) => setError(error.message))
              }
              title={isMockMode ? 'XLSX доступен в HTTP-режиме' : 'Выгрузить реестр за период'}
            >
              <Download size={15} />
              Выгрузить в Excel
            </button>
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
          </div>
        }
      />
      <ErrorMessage text={error} />
      {loading && <Loading />}
      {!data.companyScope && companyViewer && (
        <div className="scope-note">
          <Building2 size={16} />
          <p>
            <b>Показаны обращения вашего подразделения.</b> Сводка по всей компании доступна роли «
            {companyViewer.name}».
          </p>
          <button onClick={() => selectUser(companyViewer.id)}>Открыть сводку по компании</button>
        </div>
      )}
      <Kpis data={data} show={show} />
      <ManagerSummary key={userId} days={days} userId={userId} revision={JSON.stringify(data)} />
      <div className="analytics-visual-grid">
        <FunnelChart data={data} show={show} />
        <DeadlineHealth data={data} show={show} />
        <ProblemTreemap data={data} show={show} />
        <WeeklyChart data={data.weekly} show={show} />
      </div>
      <EmergingProblems
        canCreate={data.companyScope}
        onCreated={() => setVersion((value) => value + 1)}
      />
      <ClustersTable data={data} show={show} />
      <FrictionMatrix data={data} show={show} />
      <div className="analytics-note">
        <ChartNoAxesCombined size={16} />
        <span>
          За период: {data.total} обращений по дате создания. Тренд всегда сравнивает последние 30
          дней с предыдущими 30 по всей истории, независимо от фильтра.
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
