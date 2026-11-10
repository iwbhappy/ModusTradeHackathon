import { useApp } from '../../store';
import type { Ticket } from '../../types';
import { cost, date, number } from '../../lib/format';
import { Panel } from '../../components/ui';

export function Metadata({ t }: { t: Ticket }) {
  const { catalog } = useApp();
  return (
    <Panel title="Сведения">
      <dl className="meta-list">
        {t.escalated && (
          <dd>
            <span className="badge attention">Эскалировано</span>
          </dd>
        )}
        {t.defaultConfirmed && <dd>Подтверждено по умолчанию</dd>}
        <dt>Автор</dt>
        <dd>{catalog!.users.find((u) => u.id === t.authorId)?.name}</dd>
        <dt>Подразделение автора</dt>
        <dd>{t.authorDepartment}</dd>
        <dt>К чему относится</dt>
        <dd>{t.targetDepartment}</dd>
        <dt>Приоритет</dt>
        <dd>{t.priority}</dd>
        <dt>Создано</dt>
        <dd>{date(t.createdAt)}</dd>
        <dt>Первый ответ</dt>
        <dd>{t.firstResponseAt ? date(t.firstResponseAt) : `До ${date(t.responseDueAt)}`}</dd>
        {!t.firstResponseAt && new Date(t.responseDueAt).getTime() < Date.now() && (
          <dd className="overdue">Первый ответ просрочен</dd>
        )}
        {t.type === 'Проблема' && (
          <>
            <dt>Стоимость проблемы</dt>
            <dd className="cost-number">
              <span className="mono">≈ {number(cost(t))}</span> чел.-ч/мес
              <small>
                {t.frequency}, {t.minutes} мин за раз · включая оценки участников
              </small>
            </dd>
          </>
        )}
      </dl>
    </Panel>
  );
}
