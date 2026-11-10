import type { AppNotification, AttachmentInfo } from '../../types';
import { clone, pause, user } from './storage';
import { saveBlob } from '../http/client';

const files = new Map<string, File>();
export async function demoLogin(userId: string) {
  await pause();
  return clone(user(userId));
}
export async function listNotifications(_userId: string): Promise<AppNotification[]> {
  return [];
}
export async function getUnreadCount(_userId: string) {
  return 0;
}
export async function readNotification(_id: string, _userId: string): Promise<void> {}
export async function runSlaCheck(_userId: string) {
  return { message: 'Проверка SLA доступна в HTTP-режиме', processed: 0 };
}
export async function exportAnalytics(_days: number, _userId: string): Promise<void> {
  throw new Error('Для выгрузки XLSX нужен HTTP-режим');
}
export async function uploadFiles(input: File[], _userId: string): Promise<AttachmentInfo[]> {
  return input.map((file) => {
    if (file.size > 10 * 1024 * 1024 || !/\.(pdf|png|jpg|docx|xlsx|txt)$/i.test(file.name)) {
      throw new Error('Файл до 10 МБ: pdf, png, jpg, docx, xlsx, txt');
    }
    const id = crypto.randomUUID();
    files.set(id, file);
    return { id, name: file.name, size: file.size };
  });
}
export function attachmentMetadata(ids: string[]): AttachmentInfo[] {
  return ids.flatMap((id) => {
    const file = files.get(id);
    return file ? [{ id, name: file.name, size: file.size }] : [];
  });
}
export async function downloadAttachment(id: string, name: string, _userId: string) {
  const file = files.get(id);
  if (!file)
    throw new Error(
      'В mock файл доступен только до перезагрузки. Для постоянного хранения используйте HTTP.',
    );
  saveBlob(file, name);
}
