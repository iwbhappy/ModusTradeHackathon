const HOUR = 3_600_000;
const START = 9;
const END = 17;

function isWorkday(date: Date) {
  return date.getDay() !== 0 && date.getDay() !== 6;
}

export function addWorkingHours(from: Date, hours: number): string {
  const result = new Date(from);
  let remaining = hours;
  while (remaining > 0) {
    if (!isWorkday(result) || result.getHours() >= END) {
      result.setDate(result.getDate() + 1);
      result.setHours(START, 0, 0, 0);
      continue;
    }
    if (result.getHours() < START) result.setHours(START, 0, 0, 0);
    const end = new Date(result);
    end.setHours(END, 0, 0, 0);
    const available = (end.getTime() - result.getTime()) / HOUR;
    const step = Math.min(remaining, available);
    result.setTime(result.getTime() + step * HOUR);
    remaining -= step;
  }
  return result.toISOString();
}

export function workingHoursBetween(from: string, to: string): number {
  const start = new Date(from);
  const finish = new Date(to);
  const day = new Date(start);
  day.setHours(0, 0, 0, 0);
  let hours = 0;
  while (day < finish) {
    if (isWorkday(day)) {
      const left = new Date(day);
      const right = new Date(day);
      left.setHours(START, 0, 0, 0);
      right.setHours(END, 0, 0, 0);
      hours += Math.max(0, Math.min(+right, +finish) - Math.max(+left, +start)) / HOUR;
    }
    day.setDate(day.getDate() + 1);
  }
  return hours;
}

// Use the last completed workday: no seed event can be dated in the future.
export function demoAnchor(now = new Date()): Date {
  const result = new Date(now);
  if (result.getHours() < END) result.setDate(result.getDate() - 1);
  while (!isWorkday(result)) result.setDate(result.getDate() - 1);
  result.setHours(END, 0, 0, 0);
  return result;
}

export function workdaysAgo(anchor: Date, count: number, hour = START): string {
  const result = new Date(anchor);
  let remaining = count;
  while (remaining > 0) {
    result.setDate(result.getDate() - 1);
    if (isWorkday(result)) remaining--;
  }
  result.setHours(hour, 0, 0, 0);
  return result.toISOString();
}
