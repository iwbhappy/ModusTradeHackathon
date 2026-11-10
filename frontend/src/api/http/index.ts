import type {
  Analytics,
  AiStatus,
  AnalyticsFilters,
  AppNotification,
  AttachmentInfo,
  Catalog,
  EmergingGroup,
  Frequency,
  RoutePreview,
  Rule,
  SimilarityContext,
  SimilarTicket,
  Status,
  Structure,
  Ticket,
  TicketDraft,
  TicketFilters,
} from '../../types';
import { request, query, saveBlob } from './client';
export { demoLogin } from './client';

const post = <T>(path: string, body: object, userId?: string) =>
  request<T>(path, { method: 'POST', body: JSON.stringify(body) }, userId);

export const getCatalog = () => request<Catalog>('/catalog');
export const resetDemo = () => post<void>('/admin/reset-demo', {});
export const listTickets = (userId: string, filters: TicketFilters = {}) =>
  request<Ticket[]>(`/tickets?${query(filters)}&limit=500`, {}, userId);
export const getTicket = (id: string, userId: string) =>
  request<Ticket>(`/tickets/${id}`, {}, userId);
export const createTicket = (draft: TicketDraft, userId: string) =>
  post<Ticket>('/tickets', draft, userId);
export const updateStatus = (id: string, status: Status, text: string, userId: string) =>
  post<Ticket>(`/tickets/${id}/status`, { status, text }, userId);
export const addComment = (id: string, text: string, userId: string) =>
  post<Ticket>(`/tickets/${id}/comments`, { text }, userId);
export const reassign = (id: string, assigneeId: string, reason: string, userId: string) =>
  post<Ticket>(`/tickets/${id}/reassign`, { assigneeId, reason }, userId);
export const confirmResolution = (id: string, solved: boolean, reason: string, userId: string) =>
  post<Ticket>(`/tickets/${id}/confirm`, { solved, reason }, userId);
export const joinTicket = (
  id: string,
  context: string,
  frequency: Frequency,
  minutes: number,
  userId: string,
) => post<Ticket>(`/tickets/${id}/join`, { context, frequency, minutes }, userId);
export const getImprovements = () => request<Ticket[]>('/improvements');
export const previewRouting = (category: string, targetDepartment: string) =>
  request<RoutePreview>(`/routing/preview?${query({ category, targetDepartment })}`);
export const saveRule = (rule: Rule, userId: string) =>
  request<void>(`/admin/routing/${rule.id}`, { method: 'PUT', body: JSON.stringify(rule) }, userId);
export const setVacation = (id: string, vacation: boolean, userId: string) =>
  request<void>(
    `/admin/users/${id}/vacation`,
    { method: 'PUT', body: JSON.stringify({ vacation }) },
    userId,
  );
export const findSimilar = (text: string, userId: string, context: SimilarityContext = {}) =>
  post<SimilarTicket[]>('/ai/similar', { text, ...context }, userId);
export const getAiStatus = () => request<AiStatus>('/ai/status');
export const getEmerging = (userId: string) =>
  request<EmergingGroup[]>('/analytics/emerging?days=90', {}, userId);
export const createCluster = (title: string, ticketIds: string[], userId: string) =>
  post<{ id: string; title: string }>('/analytics/clusters', { title, ticketIds }, userId);
export const suggestStructure = (text: string) => post<Structure>('/ai/structure', { text });
export const draftResponse = async (id: string, status: Status, userId: string) =>
  (await post<{ text: string }>(`/tickets/${id}/draft-response`, { status }, userId)).text;
export const getAnalytics = (days: number, userId: string) =>
  request<Analytics>(`/analytics?${query({ days })}`, {}, userId);
export const getAnalyticsTickets = (days: number, filters: AnalyticsFilters, userId: string) =>
  request<Ticket[]>(`/analytics/tickets?${query({ days, ...filters })}&limit=500`, {}, userId);
export const listNotifications = (userId: string) =>
  request<AppNotification[]>('/notifications', {}, userId);
export const getUnreadCount = (userId: string) =>
  request<number>('/notifications/unread-count', {}, userId);
export const readNotification = (id: string, userId: string) =>
  post<void>(`/notifications/${id}/read`, {}, userId);
export const runSlaCheck = (userId: string) =>
  post<{ message: string; processed: number }>('/admin/run-sla-check', {}, userId);
export async function uploadFiles(files: File[], userId: string): Promise<AttachmentInfo[]> {
  const uploaded: AttachmentInfo[] = [];
  for (const file of files) {
    const body = new FormData();
    body.append('file', file);
    uploaded.push(await request<AttachmentInfo>('/attachments', { method: 'POST', body }, userId));
  }
  return uploaded;
}
export async function downloadAttachment(id: string, name: string, userId: string) {
  saveBlob(
    await request<Blob>(
      `/attachments/${id}`,
      { headers: { Accept: 'application/octet-stream' } },
      userId,
    ),
    name,
  );
}
export async function exportAnalytics(days: number, userId: string) {
  saveBlob(
    await request<Blob>(
      `/analytics/export.xlsx?days=${days}`,
      {
        headers: { Accept: 'application/octet-stream' },
      },
      userId,
    ),
    'signal-register.xlsx',
  );
}
