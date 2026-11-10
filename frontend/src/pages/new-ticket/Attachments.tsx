import { Paperclip, X } from 'lucide-react';

export function Attachments({
  names,
  onChange,
}: {
  names: string[];
  onChange: (names: string[]) => void;
}) {
  return (
    <>
      <div className="attachment-row">
        <label className="button">
          <Paperclip size={15} />
          Прикрепить файл
          <input
            type="file"
            className="sr-only"
            multiple
            onChange={(e) => {
              onChange([
                ...new Set([...names, ...Array.from(e.target.files || []).map((f) => f.name)]),
              ]);
              e.target.value = '';
            }}
          />
        </label>
        <small>В прототипе сохраняются только имена файлов</small>
      </div>
      {names.map((name) => (
        <span className="file-chip" key={name}>
          <Paperclip size={13} />
          {name}
          <button
            type="button"
            className="icon-button"
            aria-label={`Удалить ${name}`}
            onClick={() => onChange(names.filter((value) => value !== name))}
          >
            <X size={13} />
          </button>
        </span>
      ))}
    </>
  );
}
