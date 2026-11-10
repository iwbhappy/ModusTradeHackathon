export type Role = 'Сотрудник' | 'Руководитель' | 'Администратор';
export type TicketType = 'Проблема' | 'Предложение' | 'Положительный отзыв';
export type Status = 'Новое' | 'На рассмотрении' | 'Ожидает уточнения' | 'В работе' | 'Реализовано' | 'Отклонено' | 'Закрыто' | 'Возвращено автором';
export type Priority = 'Низкий' | 'Средний' | 'Высокий';
export type Frequency = 'ежедневно' | 'еженедельно' | 'ежемесячно' | 'разово';
export interface User { id: string; name: string; role: Role; department: string; vacation: boolean }
export interface Rule { id: string; category: string; department: string; primaryId: string; backupId: string; responseDays: number; resolutionDays: number }
export interface Event { id: string; date: string; actor: string; text: string; status?: Status }
export interface Comment { id: string; date: string; author: string; text: string }
export interface Participant { userId: string; department: string; context: string; frequency: Frequency; minutes: number }
export interface Ticket {
  id: string; title: string; text: string; type: TicketType; category: string; priority: Priority; status: Status;
  authorId: string; authorDepartment: string; targetDepartment: string; assigneeId: string;
  createdAt: string; responseDueAt: string; dueAt: string; firstResponseAt?: string; implementedAt?: string; closedAt?: string;
  events: Event[]; comments: Comment[]; participants: Participant[]; frequency: Frequency; minutes: number;
  solution: string; effect: string; changed: string; rejection: string; confirmed: boolean; attachments: string[]; clusterId: string;
}
export interface Cluster { id: string; title: string; keywords: string[] }
export interface TicketDraft { type: TicketType; category: string; targetDepartment: string; text: string; solution: string; effect: string; priority: Priority; frequency: Frequency; minutes: number; attachments: string[] }
export interface Structure { problem: string; solution: string; effect: string; category: string; priority: Priority }
export interface RoutePreview { assignee: User; primary: User; fallback: boolean; responseDays: number; resolutionDays: number; responseDueAt: string; dueAt: string }
export interface TicketFilters { search?: string; department?: string; category?: string; status?: string; priority?: string; overdue?: boolean; cluster?: string; authorDepartment?: string; targetDepartment?: string }
export interface Analytics { tickets: Ticket[]; clusters: Cluster[]; clusterTrends: Record<string, number>; departments: string[]; users: User[]; considered: number; medianHours: number; averageHours: number; resultRate: number; implemented: number; confirmed: number }
export interface Catalog { users: User[]; rules: Rule[]; departments: string[]; categories: string[]; clusters: Cluster[]; statuses: Status[] }
export interface Database { version: number; tickets: Ticket[]; users: User[]; rules: Rule[] }
