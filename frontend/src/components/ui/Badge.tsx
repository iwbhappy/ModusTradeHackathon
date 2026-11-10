export function Badge({ status }: { status: string }) {
  const style = ['Реализовано', 'Закрыто'].includes(status)
    ? 'success'
    : ['Ожидает уточнения', 'Возвращено автором'].includes(status)
      ? 'attention'
      : status === 'Отклонено'
        ? 'muted'
        : 'blue';
  return (
    <span className={`badge ${style}`}>
      <span className="status-dot" />
      {status}
    </span>
  );
}
