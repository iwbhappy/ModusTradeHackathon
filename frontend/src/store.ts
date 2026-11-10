import { create } from 'zustand';
import type { Catalog, Role } from './types';
import { demoLogin, getCatalog } from './api';
interface AppState {
  catalog: Catalog | null;
  userId: string;
  revision: number;
  notice: string;
  load: () => Promise<void>;
  selectUser: (id: string) => Promise<void>;
  selectRole: (role: Role) => Promise<void>;
  refresh: () => Promise<void>;
  notify: (text: string) => void;
}
const stored = localStorage.getItem('signal-user') || 'employee-1';
export const useApp = create<AppState>((set, get) => ({
  catalog: null,
  userId: stored,
  revision: 0,
  notice: '',
  load: async () => {
    await demoLogin(get().userId);
    const catalog = await getCatalog();
    const userId = catalog.users.some((u) => u.id === get().userId)
      ? get().userId
      : catalog.users[0].id;
    set({ catalog, userId });
  },
  selectUser: async (userId) => {
    await demoLogin(userId);
    const catalog = await getCatalog();
    localStorage.setItem('signal-user', userId);
    set({ userId, catalog });
  },
  selectRole: async (role) => {
    const target = get().catalog?.users.find((u) => u.role === role);
    if (target) await get().selectUser(target.id);
  },
  refresh: async () => {
    const catalog = await getCatalog();
    set((s) => ({ catalog, revision: s.revision + 1 }));
  },
  notify: (notice) => set({ notice }),
}));
