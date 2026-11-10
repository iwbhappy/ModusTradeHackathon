import { Send } from 'lucide-react';
import type { RoutePreview } from '../../types';
import { date } from '../../lib/format';

export function RoutingPreview({ route }: { route: RoutePreview }) {
  return (
    <div className="route-preview">
      <Send size={18} />
      <div>
        <strong>Обращение получит: {route.assignee.name}</strong>
        <p className="small muted">
          {route.assignee.role} · {route.assignee.department}
        </p>
        {route.fallback && (
          <p className="overdue">
            {route.reason || `${route.primary.name} в отпуске. Выбран резервный ответственный.`}
          </p>
        )}
        <p>
          Первый ответ до <b>{date(route.responseDueAt)}</b> · решение до {date(route.dueAt)}
        </p>
        <small>
          {route.responseDays} и {route.resolutionDays} рабочих дней по правилу категории
        </small>
      </div>
    </div>
  );
}
