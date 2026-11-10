import type { Ticket, User } from '../types';

// UI and static demo mirror the server; HTTP always checks permissions again.
export function canManage(user: User, ticket: Ticket, users: User[]) {
  return (
    user.role === 'Руководитель' &&
    (ticket.assigneeId === user.id ||
      (!!user.isDepartmentHead &&
        users.find((u) => u.id === ticket.assigneeId)?.department === user.department) ||
      (!!user.canViewCompanyAnalytics && !!ticket.escalated))
  );
}

export function canRead(user: User, ticket: Ticket, users: User[]) {
  return (
    user.role === 'Администратор' ||
    canManage(user, ticket, users) ||
    (user.role === 'Руководитель' &&
      !!user.isDepartmentHead &&
      ticket.authorDepartment === user.department) ||
    (user.role === 'Сотрудник' &&
      (ticket.authorId === user.id || ticket.participants.some((p) => p.userId === user.id)))
  );
}

export function canComment(user: User, ticket: Ticket, users: User[]) {
  return (
    canRead(user, ticket, users) && (user.role === 'Сотрудник' || canManage(user, ticket, users))
  );
}
