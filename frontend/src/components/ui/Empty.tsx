import type { ReactNode } from 'react';
import { Inbox } from 'lucide-react';
export function Empty({
  text = 'Обращений пока нет',
  children,
}: {
  text?: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty">
      <Inbox size={28} />
      <strong>{text}</strong>
      {children}
    </div>
  );
}
