import type * as Http from './http';
export const isMockMode = import.meta.env.VITE_API_MODE === 'mock';
const adapter = isMockMode ? import('./mock') : import('./http');

export const demoLogin: typeof Http.demoLogin = (...args) =>
  adapter.then((api) => api.demoLogin(...args));
export const getCatalog: typeof Http.getCatalog = (...args) =>
  adapter.then((api) => api.getCatalog(...args));
export const resetDemo: typeof Http.resetDemo = (...args) =>
  adapter.then((api) => api.resetDemo(...args));
export const listTickets: typeof Http.listTickets = (...args) =>
  adapter.then((api) => api.listTickets(...args));
export const getTicket: typeof Http.getTicket = (...args) =>
  adapter.then((api) => api.getTicket(...args));
export const createTicket: typeof Http.createTicket = (...args) =>
  adapter.then((api) => api.createTicket(...args));
export const updateStatus: typeof Http.updateStatus = (...args) =>
  adapter.then((api) => api.updateStatus(...args));
export const addComment: typeof Http.addComment = (...args) =>
  adapter.then((api) => api.addComment(...args));
export const reassign: typeof Http.reassign = (...args) =>
  adapter.then((api) => api.reassign(...args));
export const confirmResolution: typeof Http.confirmResolution = (...args) =>
  adapter.then((api) => api.confirmResolution(...args));
export const joinTicket: typeof Http.joinTicket = (...args) =>
  adapter.then((api) => api.joinTicket(...args));
export const getImprovements: typeof Http.getImprovements = (...args) =>
  adapter.then((api) => api.getImprovements(...args));
export const previewRouting: typeof Http.previewRouting = (...args) =>
  adapter.then((api) => api.previewRouting(...args));
export const saveRule: typeof Http.saveRule = (...args) =>
  adapter.then((api) => api.saveRule(...args));
export const setVacation: typeof Http.setVacation = (...args) =>
  adapter.then((api) => api.setVacation(...args));
export const findSimilar: typeof Http.findSimilar = (...args) =>
  adapter.then((api) => api.findSimilar(...args));
export const getAiStatus: typeof Http.getAiStatus = (...args) =>
  adapter.then((api) => api.getAiStatus(...args));
export const getEmerging: typeof Http.getEmerging = (...args) =>
  adapter.then((api) => api.getEmerging(...args));
export const createCluster: typeof Http.createCluster = (...args) =>
  adapter.then((api) => api.createCluster(...args));
export const suggestStructure: typeof Http.suggestStructure = (...args) =>
  adapter.then((api) => api.suggestStructure(...args));
export const draftResponse: typeof Http.draftResponse = (...args) =>
  adapter.then((api) => api.draftResponse(...args));
export const getAnalytics: typeof Http.getAnalytics = (...args) =>
  adapter.then((api) => api.getAnalytics(...args));
export const getAnalyticsTickets: typeof Http.getAnalyticsTickets = (...args) =>
  adapter.then((api) => api.getAnalyticsTickets(...args));
export const listNotifications: typeof Http.listNotifications = (...args) =>
  adapter.then((api) => api.listNotifications(...args));
export const getUnreadCount: typeof Http.getUnreadCount = (...args) =>
  adapter.then((api) => api.getUnreadCount(...args));
export const readNotification: typeof Http.readNotification = (...args) =>
  adapter.then((api) => api.readNotification(...args));
export const runSlaCheck: typeof Http.runSlaCheck = (...args) =>
  adapter.then((api) => api.runSlaCheck(...args));
export const uploadFiles: typeof Http.uploadFiles = (...args) =>
  adapter.then((api) => api.uploadFiles(...args));
export const downloadAttachment: typeof Http.downloadAttachment = (...args) =>
  adapter.then((api) => api.downloadAttachment(...args));
export const exportAnalytics: typeof Http.exportAnalytics = (...args) =>
  adapter.then((api) => api.exportAnalytics(...args));
