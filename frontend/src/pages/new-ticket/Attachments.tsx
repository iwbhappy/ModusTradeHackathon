import { Paperclip, X } from 'lucide-react';
import { useState } from 'react';
import { uploadFiles } from '../../api';
import { useApp } from '../../store';
import type { AttachmentInfo } from '../../types';
import { ErrorMessage } from '../../components/ui';

export function Attachments({
  names,
  onChange,
  onUpload,
  setBusy,
}: {
  names: string[];
  onChange: (names: string[]) => void;
  onUpload: (items: AttachmentInfo[]) => void;
  setBusy: (busy: boolean) => void;
}) {
  const { userId } = useApp();
  const [error, setError] = useState('');
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
            accept=".pdf,.png,.jpg,.docx,.xlsx,.txt"
            onChange={async (e) => {
              const files = Array.from(e.target.files || []);
              e.target.value = '';
              setBusy(true);
              setError('');
              try {
                onUpload(await uploadFiles(files, userId));
              } catch (error) {
                setError((error as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          />
        </label>
        <small>До 10 МБ · pdf, png, jpg, docx, xlsx, txt</small>
      </div>
      <ErrorMessage text={error} />
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
