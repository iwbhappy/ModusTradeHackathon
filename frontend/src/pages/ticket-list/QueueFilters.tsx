import { Search } from 'lucide-react';

import { useApp } from '../../store';

import type { SetURLSearchParams } from 'react-router-dom';
export function QueueFilters({
  mode,
  params,
  setParams,
  set,
}: {
  mode: 'mine' | 'inbox' | 'all';
  params: URLSearchParams;
  setParams: SetURLSearchParams;
  set: (key: string, value: string) => void;
}) {
  const { catalog } = useApp();
  const search = params.get('search') || '';
  if (!catalog) return null;
  return (
    <div className="filters">
      <div className="search-field">
        <Search size={16} />
        <input
          aria-label="Поиск в списке"
          placeholder="Поиск по ID или тексту"
          value={search}
          onChange={(e) => set('search', e.target.value)}
        />
      </div>
      {mode !== 'mine' && (
        <>
          <select
            aria-label="Подразделение проблемы"
            value={params.get('department') || ''}
            onChange={(e) => set('department', e.target.value)}
          >
            <option value="">Все подразделения</option>
            {catalog.departments.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
          <select
            aria-label="Категория"
            value={params.get('category') || ''}
            onChange={(e) => set('category', e.target.value)}
          >
            <option value="">Все категории</option>
            {catalog.categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </>
      )}
      <select
        aria-label="Статус"
        value={params.get('status') || ''}
        onChange={(e) => set('status', e.target.value)}
      >
        <option value="">Все статусы</option>
        {catalog.statuses.map((s) => (
          <option key={s}>{s}</option>
        ))}
      </select>
      {mode !== 'mine' && (
        <>
          <select
            aria-label="Приоритет"
            value={params.get('priority') || ''}
            onChange={(e) => set('priority', e.target.value)}
          >
            <option value="">Приоритет</option>
            {['Высокий', 'Средний', 'Низкий'].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <select
            aria-label="Срок"
            value={params.get('deadline') || ''}
            onChange={(e) => set('deadline', e.target.value)}
          >
            <option value="">Любой срок</option>
            <option value="overdue">Просрочены</option>
            <option value="soon">До 3 дней</option>
          </select>
        </>
      )}
      {params.size > 0 && (
        <button className="text-button" onClick={() => setParams({})}>
          Сбросить
        </button>
      )}
    </div>
  );
}
