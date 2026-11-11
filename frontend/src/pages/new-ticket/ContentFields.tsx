import type { Dispatch, ReactNode, SetStateAction } from 'react';
import { Clock3 } from 'lucide-react';
import { Field } from '../../components/ui';
import { useApp } from '../../store';
import type { TicketDraft, TicketType } from '../../types';
import { monthly, number } from '../../lib/format';
import { Attachments } from './Attachments';
import { StructureSuggestion } from './StructureSuggestion';
import { CostFields } from './CostFields';

export function ContentFields({
  draft,
  setDraft,
  busy,
  setBusy,
  recipient,
  onDepartmentChange,
}: {
  draft: TicketDraft;
  setDraft: Dispatch<SetStateAction<TicketDraft>>;
  busy: boolean;
  setBusy: (busy: boolean) => void;
  recipient: ReactNode;
  onDepartmentChange: (department: string) => void;
}) {
  const { catalog, notify } = useApp();
  if (!catalog) return null;
  const change = <K extends keyof TicketDraft>(key: K, value: TicketDraft[K]) =>
    setDraft((previous) => ({ ...previous, [key]: value }));
  return (
    <>
      <fieldset className="type-field">
        <legend>Тип обращения *</legend>
        <div className="segmented">
          {(['Проблема', 'Предложение', 'Положительный отзыв'] as TicketType[]).map((type) => (
            <button
              type="button"
              key={type}
              className={type === draft.type ? 'selected' : ''}
              onClick={() => change('type', type)}
            >
              {type}
            </button>
          ))}
        </div>
      </fieldset>
      <div className="form-grid">
        <Field label="Категория *">
          <select value={draft.category} onChange={(e) => change('category', e.target.value)}>
            {catalog.categories.map((category) => (
              <option key={category}>{category}</option>
            ))}
          </select>
        </Field>
        <Field label="К какому подразделению относится *">
          <select
            value={draft.targetDepartment}
            onChange={(e) => onDepartmentChange(e.target.value)}
          >
            {catalog.departments.map((department) => (
              <option key={department}>{department}</option>
            ))}
          </select>
        </Field>
      </div>
      {recipient}
      <Field
        label="Кратко о сути"
        hint={`${draft.title.length}/80 · Необязательно: можно оставить пустым`}
      >
        <input
          maxLength={80}
          value={draft.title}
          onChange={(e) => change('title', e.target.value)}
          placeholder="Например: не хватает параметров в заявке на закупку"
        />
      </Field>
      <Field
        label="Описание ситуации *"
        hint="Что происходит и как это влияет на работу. Без конфиденциальных сведений."
      >
        <textarea
          required
          minLength={20}
          maxLength={6000}
          rows={7}
          value={draft.text}
          onChange={(e) => change('text', e.target.value)}
          placeholder="Например: в заявках на закупку не хватает назначения изделия и параметров…"
        />
      </Field>
      <StructureSuggestion
        text={draft.text}
        category={draft.category}
        targetDepartment={draft.targetDepartment}
        busy={busy}
        setBusy={setBusy}
        onAppend={(text) => change('text', text)}
        onAccept={(structure) => {
          setDraft((previous) => ({
            ...previous,
            title: structure.title,
            text: structure.problem,
            solution: structure.solution,
            effect: structure.effect,
            category: structure.category,
            priority: structure.priority,
          }));
          notify('Структура принята. Поля доступны для редактирования.');
        }}
      />
      <Field label="Предлагаемое решение">
        <textarea
          rows={3}
          value={draft.solution}
          onChange={(e) => change('solution', e.target.value)}
          placeholder="Как, по вашему мнению, можно улучшить ситуацию?"
        />
      </Field>
      {draft.effect && (
        <Field label="Ожидаемый эффект">
          <textarea
            rows={2}
            value={draft.effect}
            onChange={(e) => change('effect', e.target.value)}
          />
        </Field>
      )}
      <Attachments
        names={draft.attachments}
        setBusy={setBusy}
        onChange={(names) =>
          setDraft((previous) => ({
            ...previous,
            attachments: names,
            attachmentIds: previous.attachmentIds?.filter((_, index) =>
              names.includes(previous.attachments[index]),
            ),
          }))
        }
        onUpload={(items) =>
          setDraft((previous) => ({
            ...previous,
            attachments: [...previous.attachments, ...items.map((item) => item.name)],
            attachmentIds: [...(previous.attachmentIds || []), ...items.map((item) => item.id)],
          }))
        }
      />
      {draft.type === 'Проблема' && (
        <section className="cost-box">
          <div className="section-label">
            <Clock3 size={17} />
            <h2>Стоимость проблемы</h2>
          </div>
          <p>Два ответа помогут расставить приоритеты по потерям времени.</p>
          <CostFields
            frequency={draft.frequency}
            minutes={draft.minutes}
            onChange={(frequency, minutes) =>
              setDraft((previous) => ({ ...previous, frequency, minutes }))
            }
          />
          <div className="cost-result">
            Ваша оценка:{' '}
            <strong className="mono">≈ {number(monthly(draft.frequency, draft.minutes))}</strong>{' '}
            чел.-ч/мес
            {draft.frequency === 'разово' && (
              <small>
                Разовая потеря: {draft.minutes} мин. Не включается в ежемесячные потери.
              </small>
            )}
          </div>
        </section>
      )}
    </>
  );
}
