import { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  FileText,
  Layers3,
  Printer,
  RotateCcw,
  TrendingUp,
} from 'lucide-react';
import { getPeriodReport, isMockMode, summarizePeriod } from '../api';
import { useApp } from '../store';
import type { PeriodReport as Report, PeriodSummary, ReportTicket } from '../types';
import { businessDate, DAY } from '../lib/period-data';
import { date, number } from '../lib/format';
import { AiSource } from '../components/AiSource';
import { MetricCards } from '../components/MetricCards';
import { Empty, ErrorMessage, Loading, Modal, PageTitle, Panel } from '../components/ui';
import { ReportTickets } from './report/ReportTickets';

function preset(days: number) {
  return { from: businessDate(new Date(Date.now() - (days - 1) * DAY)), to: businessDate() };
}
export function PeriodReportPage() {
  const { userId, revision } = useApp();
  const [range, setRange] = useState(() => preset(7));
  const [selected, setSelected] = useState('7');
  const [data, setData] = useState<Report | null>(null);
  const [summary, setSummary] = useState<PeriodSummary | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const [drill, setDrill] = useState<{ title: string; tickets: ReportTicket[] } | null>(null);
  const generation = useRef(0);
  useEffect(() => {
    let live = true;
    generation.current += 1;
    setData(null);
    setSummary(null);
    setError('');
    setLoading(true);
    setBusy(false);
    setDrill(null);
    setExpanded({});
    if (!range.from || !range.to || range.from > range.to) {
      setError('Укажите корректный период: начало не позже окончания.');
      setLoading(false);
      return;
    }
    getPeriodReport(range.from, range.to, userId)
      .then((result) => {
        if (live) setData(result);
      })
      .catch((error) => {
        if (live) setError(error.message);
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
      generation.current += 1;
    };
  }, [range.from, range.to, userId, revision]);
  return (
    <div className="period-report-page">
      <PageTitle
        title="Отчёт за период"
        subtitle="Изменения, которые стоит увидеть. Детали — когда они нужны."
        action={
          <button disabled={!data || loading} className="no-print" onClick={() => window.print()}>
            <Printer size={17} />
            Печать / PDF
          </button>
        }
      />
      <div className="period-selector no-print">
        <div className="segmented">
          {[
            ['7', 'Неделя'],
            ['14', '2 недели'],
            ['30', 'Месяц'],
            ['90', 'Квартал'],
            ['custom', 'Свой период'],
          ].map(([value, label]) => (
            <button
              key={value}
              className={selected === value ? 'selected' : ''}
              onClick={() => {
                setSelected(value);
                if (value !== 'custom') setRange(preset(Number(value)));
              }}
            >
              {label}
            </button>
          ))}
        </div>
        {selected === 'custom' && (
          <div className="date-range">
            <label>
              С{' '}
              <input
                aria-label="Начало периода"
                type="date"
                value={range.from}
                max={range.to}
                onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
              />
            </label>
            <label>
              По{' '}
              <input
                aria-label="Окончание периода"
                type="date"
                min={range.from}
                max={businessDate()}
                value={range.to}
                onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
              />
            </label>
          </div>
        )}
        {selected !== 'custom' && (
          <span className="small muted">Последние {selected} дней, включая сегодня</span>
        )}
      </div>
      <ErrorMessage text={error} />
      {loading && <Loading />}
      {data && (
        <>
          <div className="report-heading">
            <div>
              <span className="eyebrow">
                {data.companyScope ? 'Вся компания' : 'Ваша область ответственности'}
              </span>
              <h2>
                {date(data.from)} — {date(data.to)}
              </h2>
            </div>
            <span>
              Сравнение: {date(data.previousFrom)} — {date(data.previousTo)}
            </span>
          </div>
          <section aria-labelledby="report-main-title">
            <h2 className="section-heading" id="report-main-title">
              <TrendingUp size={20} />
              Главное за период
            </h2>
            <MetricCards metrics={data.metrics} />
            <p className="data-note">
              «Решено» — реализовано или отклонено с мотивировкой. Экономия — оценка месячных потерь
              у реализованных обращений, а не измеренная экономия.
            </p>
          </section>
          <Panel
            title="Требует внимания"
            icon={<AlertTriangle size={18} />}
            className={data.attention.length ? 'panel-attention' : 'panel-result'}
            aside={
              <span className="quiet-label">Текущее состояние · {date(data.attentionAsOf)}</span>
            }
          >
            {data.attention.length ? (
              <div className="attention-list">
                {data.attention.map((item) => {
                  const Icon =
                    item.id === 'awaiting'
                      ? Clock3
                      : item.id === 'returned'
                        ? RotateCcw
                        : item.id === 'emerging'
                          ? Layers3
                          : AlertTriangle;
                  return (
                    <button
                      key={item.id}
                      className={`attention-item severity-${item.id}`}
                      onClick={() => setDrill({ title: item.label, tickets: item.tickets })}
                      title={`Открыть список: ${item.label}`}
                    >
                      <Icon size={19} />
                      <span>{item.label}</span>
                      <strong className="mono">{item.count}</strong>
                      <span aria-hidden="true">→</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="all-clear">
                <CheckCircle2 size={20} />
                Всё под контролем
              </div>
            )}
          </Panel>
          <section className="report-results" aria-labelledby="report-groups-title">
            <div className="between report-section-title">
              <h2 className="section-heading" id="report-groups-title">
                <Layers3 size={20} />
                Что сделано — по группам
              </h2>
              <button
                className="no-print"
                disabled={busy || !data.groups.length}
                onClick={async () => {
                  const current = ++generation.current;
                  setBusy(true);
                  setError('');
                  try {
                    const result = await summarizePeriod(range.from, range.to, userId);
                    if (current === generation.current) {
                      if (result.report) setData(result.report);
                      setSummary(result);
                    }
                  } catch (error) {
                    if (current === generation.current) {
                      setError((error as Error).message);
                      setSummary({
                        source: 'rules',
                        cached: false,
                        notice:
                          'Сервис формулировок недоступен. Показана автоподсказка по правилам.',
                        summaries: Object.fromEntries(
                          data.groups.map((group) => [group.id, group.brief]),
                        ),
                      });
                    }
                  } finally {
                    if (current === generation.current) setBusy(false);
                  }
                }}
              >
                <FileText size={16} />
                {busy ? 'Формулируем…' : 'Сформулировать кратко'}
              </button>
            </div>
            <AiSource result={summary || { source: 'rules', cached: false }} />
            <p className="data-note no-print">
              {isMockMode
                ? 'Локальные данные и формулировки по правилам.'
                : 'Одна кнопка — один общий запрос Gemini. Передаются только группы, счётчики и результаты; тексты жалоб и имена не отправляются.'}
            </p>
            {!data.groups.length && <Empty text="За этот период движения по обращениям нет" />}
            <div className="report-groups">
              {data.groups.map((group) => (
                <Panel
                  key={group.id}
                  title={group.title}
                  icon={<Layers3 size={18} />}
                  className={`report-group ${group.counts.implemented ? 'panel-result' : ''}`}
                  aside={<span className="mono">≈ {number(group.monthlyCost)} чел.-ч/мес</span>}
                >
                  <div className="panel-body">
                    <p className="small muted">{group.departments.join(' · ')}</p>
                    <div className="group-counts">
                      <span>
                        Новых <b>{group.counts.incoming}</b>
                      </span>
                      <span>
                        Реализовано <b>{group.counts.implemented}</b>
                      </span>
                      <span>
                        Отклонено <b>{group.counts.rejected}</b>
                      </span>
                      <span>
                        В работе <b>{group.counts.working}</b>
                      </span>
                    </div>
                    <div className="group-brief">
                      <span className="eyebrow">Коротко</span>
                      <p>{summary?.summaries[group.id] || group.brief}</p>
                    </div>
                    <button
                      className="text-button no-print"
                      aria-expanded={!!expanded[group.id]}
                      aria-controls={`items-${encodeURIComponent(group.id)}`}
                      onClick={() => setExpanded((old) => ({ ...old, [group.id]: !old[group.id] }))}
                    >
                      {expanded[group.id]
                        ? 'Скрыть обращения'
                        : `Показать обращения (${group.tickets.length})`}
                    </button>
                  </div>
                  <div
                    id={`items-${encodeURIComponent(group.id)}`}
                    className={`group-tickets ${expanded[group.id] ? '' : 'collapsed'}`}
                  >
                    <ReportTickets tickets={group.tickets} />
                  </div>
                </Panel>
              ))}
            </div>
          </section>
          <Panel title="Новые темы" icon={<Layers3 size={18} />}>
            <div className="panel-body">
              {data.newTopics.length ? (
                data.newTopics.map((topic) => (
                  <article key={topic.tickets[0].id} className="new-topic">
                    <h3>{topic.title}</h3>
                    <p>
                      {topic.departments.join(' · ')} · ≈ {number(topic.monthlyCost)} чел.-ч/мес
                    </p>
                    <button
                      className="text-button"
                      onClick={() => setDrill({ title: topic.title, tickets: topic.tickets })}
                    >
                      Показать обращения ({topic.tickets.length})
                    </button>
                  </article>
                ))
              ) : (
                <p className="muted">Новых зарождающихся тем за период не найдено.</p>
              )}
              <p className="data-note">
                Группы, впервые замеченные в выбранном периоде.{' '}
                {isMockMode
                  ? 'В статической версии — по совпадениям слов.'
                  : 'По локальному смысловому поиску; до готовности модели список может быть пуст.'}
              </p>
            </div>
          </Panel>
          <p className="print-footnote">
            Сигнал · {data.companyScope ? 'Вся компания' : 'Область доступа пользователя'} ·{' '}
            {date(data.from)} — {date(data.to)}. Показатели по датам событий; одно обращение в
            каждом показателе учитывается один раз.
          </p>
        </>
      )}
      {drill && (
        <Modal title={drill.title} onClose={() => setDrill(null)}>
          <ReportTickets tickets={drill.tickets} />
        </Modal>
      )}
    </div>
  );
}
