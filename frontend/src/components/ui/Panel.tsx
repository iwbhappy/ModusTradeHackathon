import type { ReactNode } from 'react';
import { PanelsTopLeft } from 'lucide-react';
export function Panel({
  title,
  aside,
  children,
  className = '',
  icon,
}: {
  title?: string;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
  icon?: ReactNode;
}) {
  return (
    <section className={`panel ${className}`}>
      {title && (
        <div className="panel-heading">
          <h2>
            {icon || <PanelsTopLeft size={17} />}
            {title}
          </h2>
          {aside}
        </div>
      )}
      {children}
    </section>
  );
}
