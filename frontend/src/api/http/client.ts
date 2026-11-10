import type { User } from '../../types';

let session: { userId: string; token: string } | null = null;
const tokens = new Map<string, string>();

async function error(response: Response): Promise<never> {
  const data = await response.json().catch(() => null);
  throw new Error(
    typeof data?.detail === 'string'
      ? data.detail
      : `Не удалось выполнить запрос (${response.status}). Повторите действие.`,
  );
}

export async function demoLogin(userId: string): Promise<User> {
  let response: Response;
  try {
    response = await fetch('/api/auth/demo-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
  } catch {
    throw new Error('Сервер недоступен. Проверьте запуск API на порту 8000.');
  }
  if (!response.ok) return error(response);
  const data = (await response.json()) as { token: string; user: User };
  session = { userId, token: data.token };
  tokens.set(userId, data.token);
  return data.user;
}

export async function request<T>(
  path: string,
  init: RequestInit = {},
  userId?: string,
): Promise<T> {
  const selected = userId || session?.userId || localStorage.getItem('signal-user') || 'employee-1';
  if (!tokens.has(selected)) await demoLogin(selected);
  const token = tokens.get(selected)!;
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      ...init,
      headers: {
        ...(init.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
        Authorization: `Bearer ${token}`,
        ...init.headers,
      },
    });
  } catch {
    throw new Error('Сервер недоступен. Не удалось сохранить изменения.');
  }
  if (!response.ok) {
    if (response.status === 401) tokens.delete(selected);
    return error(response);
  }
  if (
    init.headers &&
    'Accept' in init.headers &&
    init.headers.Accept === 'application/octet-stream'
  ) {
    return (await response.blob()) as T;
  }
  return (await response.json()) as T;
}

export function query(values: object): string {
  return new URLSearchParams(
    Object.entries(values)
      .filter(([, value]) => value !== undefined && value !== '')
      .map(([key, value]) => [key, String(value)]),
  ).toString();
}

export function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
