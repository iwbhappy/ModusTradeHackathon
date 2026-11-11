import { useEffect, useRef, useState } from 'react';
import { Check, ClipboardCheck, ScanSearch, Wand2 } from 'lucide-react';
import { checkCompleteness, suggestStructure } from '../../api';
import type { Completeness, Structure } from '../../types';
import { ErrorMessage, Field } from '../../components/ui';
import { AiSource } from '../../components/AiSource';
import { useApp } from '../../store';

export function StructureSuggestion({
  text,
  category,
  targetDepartment,
  busy,
  setBusy,
  onAccept,
  onAppend,
}: {
  text: string;
  category: string;
  targetDepartment: string;
  busy: boolean;
  setBusy: (busy: boolean) => void;
  onAccept: (structure: Structure) => void;
  onAppend: (text: string) => void;
}) {
  const { userId } = useApp();
  const [structure, setStructure] = useState<Structure | null>(null);
  const [completeness, setCompleteness] = useState<Completeness | null>(null);
  const [answers, setAnswers] = useState<string[]>([]);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');
  const requestVersion = useRef(0);
  useEffect(() => {
    requestVersion.current += 1;
    setStructure(null);
    setCompleteness(null);
    setAnswers([]);
    setError('');
    return () => {
      requestVersion.current += 1;
    };
  }, [text, category, targetDepartment, userId]);
  return (
    <>
      <div className="structure-button">
        <button
          type="button"
          disabled={busy || checking || text.trim().length < 20}
          onClick={async () => {
            const version = ++requestVersion.current;
            setBusy(true);
            setError('');
            try {
              const result = await suggestStructure(text, { category, targetDepartment });
              if (version === requestVersion.current) setStructure(result);
            } catch (error) {
              if (version === requestVersion.current) setError((error as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <Wand2 size={16} />
          Структурировать текст
        </button>
        <button
          type="button"
          disabled={busy || checking || text.trim().length < 20}
          onClick={async () => {
            const version = ++requestVersion.current;
            setChecking(true);
            setError('');
            try {
              const result = await checkCompleteness(text, { category, targetDepartment }, userId);
              if (version === requestVersion.current) {
                setCompleteness(result);
                setAnswers(result.questions.map(() => ''));
              }
            } catch (error) {
              if (version === requestVersion.current) setError((error as Error).message);
            } finally {
              setChecking(false);
            }
          }}
        >
          <ClipboardCheck size={16} />
          {checking ? 'Проверяем полноту…' : 'Проверить полноту'}
        </button>
        <small>При включённом Gemini текст отправляется во внешний сервис по кнопке.</small>
      </div>
      <ErrorMessage text={error} />
      {completeness && (
        <section className="system-box ai-assistant" aria-label="Проверка полноты">
          <div className="between">
            <h3>{completeness.complete ? 'Описание достаточно полное' : 'Чего не хватает'}</h3>
            <button type="button" onClick={() => setCompleteness(null)}>
              Закрыть
            </button>
          </div>
          <AiSource result={completeness} />
          {completeness.questions.map((question, index) => (
            <Field label={question} key={question}>
              <input
                value={answers[index] || ''}
                maxLength={400}
                placeholder="Короткий ответ (необязательно)"
                onChange={(event) =>
                  setAnswers((previous) =>
                    previous.map((value, i) => (i === index ? event.target.value : value)),
                  )
                }
              />
            </Field>
          ))}
          {!!completeness.questions.length && (
            <button
              type="button"
              disabled={!answers.some((answer) => answer.trim())}
              onClick={() => {
                const pairs = completeness.questions.flatMap((question, index) =>
                  answers[index]?.trim() ? [`${question} — ${answers[index].trim()}`] : [],
                );
                const next = `${text.trimEnd()}\n\nУточнения:\n${pairs.join('\n')}`;
                if (next.length > 6000) {
                  setError(
                    'Описание вместе с уточнениями превышает 6000 символов. Сократите текст или ответы.',
                  );
                  return;
                }
                onAppend(next);
                setCompleteness(null);
              }}
            >
              Добавить ответы в описание
            </button>
          )}
        </section>
      )}
      {structure && (
        <div className="system-box">
          <div className="section-label">
            <ScanSearch size={16} />
            <strong>Предлагаемая структура</strong>
          </div>
          <AiSource result={structure} />
          <dl className="structure">
            <dt>Кратко о сути</dt>
            <dd>{structure.title}</dd>
            <dt>Проблема</dt>
            <dd>{structure.problem}</dd>
            <dt>Предлагаемое решение</dt>
            <dd>{structure.solution}</dd>
            <dt>Ожидаемый эффект</dt>
            <dd>{structure.effect}</dd>
          </dl>
          <p className="small">
            Категория: {structure.category} · Приоритет: {structure.priority}
          </p>
          <div className="button-row">
            <button
              type="button"
              onClick={() => {
                onAccept(structure);
                setStructure(null);
              }}
            >
              <Check size={15} />
              Принять
            </button>
            <button type="button" onClick={() => setStructure(null)}>
              Отклонить
            </button>
          </div>
        </div>
      )}
    </>
  );
}
