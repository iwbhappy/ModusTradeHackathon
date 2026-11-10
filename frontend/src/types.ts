export type Role = 'Сотрудник' | 'Руководитель' | 'Администратор';
export type TicketType = 'Проблема' | 'Предложение' | 'Положительный отзыв';
export type Status =
  | 'Новое'
  | 'На рассмотрении'
  | 'Ожидает уточнения'
  | 'В работе'
  | 'Реализовано'
  | 'Отклонено'
  | 'Закрыто'
  | 'Возвращено автором';
export type Priority = 'Низкий' | 'Средний' | 'Высокий';
export type Frequency = 'ежедневно' | 'еженедельно' | 'ежемесячно' | 'разово';
export interface User {
  id: string;
  name: string;
  role: Role;
  department: string;
  vacation: boolean;
  isDepartmentHead?: boolean;
  canViewCompanyAnalytics?: boolean;
}
export interface Rule {
  id: string;
  category: string;
  department: string;
  primaryId: string;
  backupId: string;
  responseDays: number;
  resolutionDays: number;
}
export interface Event {
  id: string;
  date: string;
  actor: string;
  text: string;
  status?: Status;
}
export interface Comment {
  id: string;
  date: string;
  author: string;
  text: string;
}
export interface Participant {
  userId: string;
  department: string;
  context: string;
  frequency: Frequency;
  minutes: number;
}
export interface Ticket {
  deadlineLabel?: string;
  id: string;
  title: string;
  text: string;
  type: TicketType;
  category: string;
  priority: Priority;
  status: Status;
  originalCategory?: string;
  escalated?: boolean;
  defaultConfirmed?: boolean;
  monthlyCost?: number;
  attachmentFiles?: AttachmentInfo[];
  authorId: string;
  authorDepartment: string;
  targetDepartment: string;
  assigneeId: string;
  createdAt: string;
  responseDueAt: string;
  dueAt: string;
  firstResponseAt?: string;
  implementedAt?: string;
  closedAt?: string;
  events: Event[];
  comments: Comment[];
  participants: Participant[];
  frequency: Frequency;
  minutes: number;
  solution: string;
  effect: string;
  changed: string;
  rejection: string;
  confirmed: boolean;
  attachments: string[];
  clusterId: string;
}
export interface Cluster {
  id: string;
  title: string;
  keywords: string[];
}
export interface TicketDraft {
  attachmentIds?: string[];
  title: string;
  type: TicketType;
  category: string;
  targetDepartment: string;
  text: string;
  solution: string;
  effect: string;
  priority: Priority;
  frequency: Frequency;
  minutes: number;
  attachments: string[];
}
export interface Structure {
  title: string;
  problem: string;
  solution: string;
  effect: string;
  category: string;
  priority: Priority;
}
export type SimilarOutcome = 'open' | 'done' | 'rejected';
export interface SimilarTicket extends Ticket {
  matchExplanation: string;
  /** Чем закончилось похожее обращение: к открытому можно присоединиться. */
  outcome: SimilarOutcome;
  /** Что изменилось или почему отклонено — для уже рассмотренных. */
  outcomeText: string;
}
export interface AiStatus {
  search: 'semantic' | 'rules';
  model: string;
  local: boolean;
}
export interface EmergingGroup {
  tickets: { id: string; title: string }[];
  departments: string[];
  monthlyCost: number;
  firstSeen: string;
  suggestedTitle: string;
}

export interface SimilarityContext {
  category?: string;
  targetDepartment?: string;
}
export interface RoutePreview {
  reason?: string;
  assignee: User;
  primary: User;
  fallback: boolean;
  responseDays: number;
  resolutionDays: number;
  responseDueAt: string;
  dueAt: string;
}
export interface TicketFilters {
  search?: string;
  department?: string;
  category?: string;
  status?: string;
  priority?: string;
  overdue?: boolean;
  cluster?: string;
  authorDepartment?: string;
  targetDepartment?: string;
}
export interface Analytics {
  total: number;
  openCount: number;
  overdueCount: number;
  distributions: Record<'type' | 'category' | 'status', { label: string; value: number }[]>;
  clusterStats: {
    id: string;
    title: string;
    count: number;
    monthlyCost: number;
    departments: string[];
    trend: number;
  }[];
  matrix: { authorDepartment: string; targetDepartment: string; count: number }[];
  sla: { department: string; count: number }[];
  weekly: { start: string; incoming: number; done: number }[];
  companyScope: boolean;
  departments: string[];
  considered: number;
  medianHours: number;
  averageHours: number;
  resultRate: number;
  implemented: number;
  confirmed: number;
  defaultConfirmed: number;
}
export interface AttachmentInfo {
  id: string;
  name: string;
  size: number;
}
export interface AppNotification {
  id: string;
  ticketId: string;
  text: string;
  date: string;
  read: boolean;
}
export interface AnalyticsFilters {
  cluster?: string;
  authorDepartment?: string;
  targetDepartment?: string;
  assigneeDepartment?: string;
  overdue?: boolean;
  type?: string;
}
export interface Catalog {
  transitions?: Record<string, Status[]>;
  users: User[];
  rules: Rule[];
  departments: string[];
  categories: string[];
  clusters: Cluster[];
  statuses: Status[];
}
export interface Database {
  version: number;
  tickets: Ticket[];
  users: User[];
  rules: Rule[];
}
