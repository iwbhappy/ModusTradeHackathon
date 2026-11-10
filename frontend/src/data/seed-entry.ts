import type { Frequency, Priority, Status, TicketType } from '../types';

// Relative working-day dates keep the demo useful after a later reset.
export interface SeedEntry {
  id: string;
  title: string;
  text: string;
  category: string;
  authorId: string;
  targetDepartment: string;
  assigneeId?: string;
  type?: TicketType;
  priority?: Priority;
  status: Status;
  clusterId: string;
  createdDaysAgo: number;
  resolvedDaysAgo?: number;
  responseHours?: number;
  changed?: string;
  rejection?: string;
  comments?: string[];
  frequency?: Frequency;
  minutes?: number;
}
