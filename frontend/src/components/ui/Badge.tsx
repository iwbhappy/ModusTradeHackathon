export function Badge({ status }: { status: string }) {
  const style =
    (
      {
        Новое: 'new',
        'На рассмотрении': 'review',
        'Ожидает уточнения': 'clarify',
        'В работе': 'work',
        Реализовано: 'done',
        Закрыто: 'closed',
        Отклонено: 'rejected',
        'Возвращено автором': 'returned',
        Эскалировано: 'escalated',
        'Подтверждено автором': 'done',
      } as Record<string, string>
    )[status] || 'rejected';
  return (
    <span className={`badge status-${style}`}>
      <span className="status-dot" />
      {status}
    </span>
  );
}
