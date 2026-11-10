import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getUnreadCount, listNotifications, readNotification } from '../../api';
import type { AppNotification } from '../../types';
import { useApp } from '../../store';
import { date } from '../../lib/format';

export function Notifications() {
  const { userId, revision } = useApp();
  const navigate = useNavigate();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    let live = true;
    const update = () =>
      Promise.all([listNotifications(userId), getUnreadCount(userId)])
        .then(([rows, count]) => {
          if (live) {
            setItems(rows);
            setUnread(count);
            setError('');
          }
        })
        .catch((error) => {
          if (live) setError(error.message);
        });
    update();
    const timer = setInterval(update, 15000);
    return () => {
      live = false;
      clearInterval(timer);
    };
  }, [userId, revision]);
  return (
    <div className="notifications">
      <button
        className="icon-button"
        aria-label={`Уведомления, непрочитанных: ${unread}`}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <Bell size={18} />
        {unread > 0 && <span className="notification-count">{unread}</span>}
      </button>
      {open && (
        <div className="notifications-list panel">
          <div className="panel-heading">
            <h2>Уведомления</h2>
            <button className="text-button" onClick={() => setOpen(false)}>
              Закрыть
            </button>
          </div>
          {error && <p className="panel-body error">{error}</p>}
          {!items.length && !error && <p className="panel-body muted">Новых уведомлений нет</p>}
          {items.map((item) => (
            <button
              key={item.id}
              className={item.read ? '' : 'unread'}
              onClick={async () => {
                try {
                  await readNotification(item.id, userId);
                  if (!item.read) setUnread((count) => Math.max(0, count - 1));
                  setItems((rows) =>
                    rows.map((row) => (row.id === item.id ? { ...row, read: true } : row)),
                  );
                  setOpen(false);
                  navigate(`/tickets/${item.ticketId}`);
                } catch (error) {
                  setError((error as Error).message);
                }
              }}
            >
              <span>{item.text}</span>
              <small>{date(item.date)}</small>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
