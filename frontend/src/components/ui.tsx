import { useEffect, useRef, type ReactNode } from 'react';
import { X, Inbox, LoaderCircle, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Ticket, User } from '../types';
import { cost, date, deadline, number, overdue } from '../lib/format';

export function Badge({ status }: { status: string }) { const style = ['Реализовано', 'Закрыто'].includes(status) ? 'success' : ['Ожидает уточнения', 'Возвращено автором'].includes(status) ? 'attention' : status === 'Отклонено' ? 'muted' : 'blue'; return <span className={`badge ${style}`}><span className="status-dot"/>{status}</span>; }
export function PageTitle({ title, subtitle, action }: { title: string; subtitle: string; action?: ReactNode }) { return <div className="page-title"><div><h1>{title}</h1><p>{subtitle}</p></div>{action}</div>; }
export function Panel({ title, aside, children, className = '' }: { title?: string; aside?: ReactNode; children: ReactNode; className?: string }) { return <section className={`panel ${className}`}>{title && <div className="panel-heading"><h2>{title}</h2>{aside}</div>}{children}</section>; }
export function Empty({ text = 'Обращений пока нет', children }: { text?: string; children?: ReactNode }) { return <div className="empty"><Inbox size={28}/><strong>{text}</strong>{children}</div>; }
export function Loading() { return <div className="loading" role="status"><LoaderCircle className="spin" size={18}/> Загрузка данных…</div>; }
export function ErrorMessage({ text }: { text: string }) { return text ? <div className="error" role="alert">{text}</div> : null; }
export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) { return <label className="field"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>; }
export function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const box = useRef<HTMLDivElement>(null); const closeRef = useRef(onClose); closeRef.current = onClose;
  useEffect(() => { const prev = document.activeElement as HTMLElement | null; box.current?.focus(); const key = (e: KeyboardEvent) => {
    if (e.key === 'Escape') closeRef.current();
    if (e.key === 'Tab') { const nodes = box.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input, select, textarea, a[href]'); if (!nodes?.length) return; const first = nodes[0], last = nodes[nodes.length - 1]; if (e.shiftKey && (document.activeElement === first || document.activeElement === box.current)) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); } }
  }; document.addEventListener('keydown', key); const overflow = document.body.style.overflow; document.body.style.overflow = 'hidden'; return () => { document.removeEventListener('keydown', key); document.body.style.overflow = overflow; prev?.focus(); }; }, []);
  return <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}><div className="modal panel" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={box}><div className="panel-heading"><h2>{title}</h2><button className="icon-button" aria-label="Закрыть окно" onClick={onClose}><X size={18}/></button></div><div className="panel-body">{children}</div></div></div>;
}
export function TicketsTable({ tickets, users, showCost = false }: { tickets: Ticket[]; users: User[]; showCost?: boolean }) {
  if (!tickets.length) return <Empty text="По выбранным условиям ничего не найдено"/>;
  return <div className="table-wrap"><table className="tickets-table"><thead><tr><th>ID / Обращение</th><th>Статус</th><th>Ответственный</th><th>Срок решения</th>{showCost && <th className="numeric">чел.-ч/мес</th>}<th>Последнее событие</th><th><span className="sr-only">Открыть</span></th></tr></thead><tbody>{tickets.map(t => <tr key={t.id}><td><Link to={`/tickets/${t.id}`} className="ticket-link"><span className="mono ticket-id">{t.id}</span><span>{t.title}</span></Link><small className="ticket-meta">{t.category} · {t.authorDepartment}</small></td><td><Badge status={t.status}/></td><td className="person-cell">{users.find(u => u.id === t.assigneeId)?.name}</td><td><div className={overdue(t) ? 'overdue' : ''}>{deadline(t)}</div><small>{date(t.dueAt)}</small></td>{showCost && <td className="numeric mono">{t.type === 'Проблема' ? number(cost(t)) : '—'}</td>}<td className="event-cell">{t.events.at(-1)?.text}<small>{date(t.events.at(-1)?.date || t.createdAt)}</small></td><td><Link aria-label={`Открыть ${t.id}`} to={`/tickets/${t.id}`}><ArrowUpRight size={16}/></Link></td></tr>)}</tbody></table></div>;
}
