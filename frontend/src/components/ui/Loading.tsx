import { LoaderCircle } from 'lucide-react';
export function Loading() {
  return (
    <div className="loading" role="status">
      <LoaderCircle className="spin" size={18} /> Загрузка данных…
    </div>
  );
}
