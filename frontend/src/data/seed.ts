import seed from '../../../data/seed.json';
import type { Catalog, Database } from '../types';
import { demoAnchor } from '../lib/business-time';

export const categoryAliases: Record<string, string> = seed.categoryMap;
export const catalogBase: Pick<Catalog, 'departments' | 'categories' | 'statuses' | 'clusters'> = {
  departments: seed.departments.map((department) => department.name),
  categories: seed.categories.map((category) => category.name),
  statuses: seed.statuses as Catalog['statuses'],
  clusters: seed.clusters,
};

export function createSeed(): Database {
  const anchor = demoAnchor().getTime();
  function materialize(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(materialize);
    if (value && typeof value === 'object') {
      if ('offsetDays' in value && typeof value.offsetDays === 'number') {
        return new Date(anchor + value.offsetDays * 86400000).toISOString();
      }
      return Object.fromEntries(
        Object.entries(value).map(([key, item]) => [key, materialize(item)]),
      );
    }
    return value;
  }
  return materialize({
    version: seed.version,
    users: seed.users,
    rules: seed.rules,
    tickets: seed.tickets,
  }) as Database;
}

export function detectCluster(text: string): string {
  const ranked = seed.clusters
    .map((cluster) => ({
      id: cluster.id,
      score: cluster.keywords.filter((word) => text.toLowerCase().includes(word)).length,
    }))
    .sort((a, b) => b.score - a.score);
  return ranked[0]?.score ? ranked[0].id : '';
}
