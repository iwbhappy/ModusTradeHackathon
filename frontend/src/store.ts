import { create } from 'zustand';
import type { Catalog, Role } from './types';
import { demoLogin, getCatalog } from './api';
interface NoticeAction {
  label: string;
  userId: string;
  ticketId: string;
}
interface AppState {
  catalog: Catalog | null;
  userId: string;
  revision: number;
  notice: string;
  noticeAction: NoticeAction | null;
  roleUsers: Record<Role, string>;
  load: () => Promise<void>;
  selectUser: (id: string) => Promise<void>;
  selectRole: (role: Role) => Promise<void>;
  refresh: () => Promise<void>;
  notify: (text: string, action?: NoticeAction) => void;
}
const stored = localStorage.getItem('signal-user') || 'employee-1';
const defaultUsers: Record<Role, string> = {
  Сотрудник: 'employee-1',
  Руководитель: 'manager-1',
  Администратор: 'admin',
};
function savedRoleUsers(): Record<Role, string> {
  try {
    const saved = JSON.parse(localStorage.getItem('signal-role-users') || '{}');
    return Object.fromEntries(
      Object.entries(defaultUsers).map(([role, id]) => [
        role,
        typeof saved?.[role] === 'string' ? saved[role] : id,
      ]),
    ) as Record<Role, string>;
  } catch {
    return { ...defaultUsers };
  }
}
function rememberUser(roleUsers: Record<Role, string>, catalog: Catalog, userId: string) {
  const user = catalog.users.find((u) => u.id === userId);
  const next = user ? { ...roleUsers, [user.role]: userId } : roleUsers;
  localStorage.setItem('signal-role-users', JSON.stringify(next));
  return next;
}
export const useApp = create<AppState>((set, get) => ({
  catalog: null,
  userId: stored,
  revision: 0,
  notice: '',
  noticeAction: null,
  roleUsers: savedRoleUsers(),
  load: async () => {
    await demoLogin(get().userId);
    const catalog = await getCatalog();
    const userId = catalog.users.some((u) => u.id === get().userId)
      ? get().userId
      : catalog.users[0].id;
    set({ catalog, userId, roleUsers: rememberUser(get().roleUsers, catalog, userId) });
  },
  selectUser: async (userId) => {
    await demoLogin(userId);
    const catalog = await getCatalog();
    localStorage.setItem('signal-user', userId);
    set({ userId, catalog, roleUsers: rememberUser(get().roleUsers, catalog, userId) });
  },
  selectRole: async (role) => {
    const users = get().catalog?.users || [];
    const target =
      users.find((u) => u.id === get().roleUsers[role] && u.role === role) ||
      users.find((u) => u.id === defaultUsers[role] && u.role === role) ||
      users.find((u) => u.role === role);
    if (target) await get().selectUser(target.id);
  },
  refresh: async () => {
    const catalog = await getCatalog();
    set((s) => ({ catalog, revision: s.revision + 1 }));
  },
  notify: (notice, action) => set({ notice, noticeAction: action || null }),
}));
