import { getCollection, type CollectionEntry } from 'astro:content';
import {
  isProjectCategoryId,
  type ProjectCategoryId,
  projectCategories,
} from './projectCategories';

export type ProjectEntry = CollectionEntry<'projects'>;

export function isProjectLive(entry: ProjectEntry): boolean {
  return (
    entry.data.published === true &&
    entry.data.publishable === true &&
    entry.data.privacyReviewed === true
  );
}

export async function getLiveProjects(): Promise<ProjectEntry[]> {
  const all = await getCollection('projects', isProjectLive);
  return sortProjects(all);
}

export function sortProjects(entries: ProjectEntry[]): ProjectEntry[] {
  return [...entries].sort((a, b) => {
    if (a.data.featured !== b.data.featured) {
      return a.data.featured ? -1 : 1;
    }
    if (a.data.featured && b.data.featured) {
      return (a.data.featuredRank ?? 99) - (b.data.featuredRank ?? 99);
    }
    const aTime = a.data.date?.getTime() ?? 0;
    const bTime = b.data.date?.getTime() ?? 0;
    if (aTime !== bTime) return bTime - aTime;
    return a.data.title.localeCompare(b.data.title);
  });
}

export function getFeaturedProjects(entries: ProjectEntry[], limit = 6): ProjectEntry[] {
  return entries
    .filter((e) => e.data.featured)
    .sort((a, b) => (a.data.featuredRank ?? 99) - (b.data.featuredRank ?? 99))
    .slice(0, limit);
}

export function countByCategory(entries: ProjectEntry[]): Record<string, number> {
  const counts: Record<string, number> = { all: entries.length };
  for (const cat of projectCategories) {
    counts[cat.id] = 0;
  }
  for (const entry of entries) {
    counts[entry.data.category] = (counts[entry.data.category] ?? 0) + 1;
  }
  return counts;
}

/** Categories that have at least one live project (for public filter chips). */
export function visibleCategories(entries: ProjectEntry[]) {
  const counts = countByCategory(entries);
  return projectCategories.filter((c) => (counts[c.id] ?? 0) > 0);
}

export function filterByCategory(
  entries: ProjectEntry[],
  category: string | null | undefined,
): ProjectEntry[] {
  if (!category || category === 'all' || !isProjectCategoryId(category)) {
    return entries;
  }
  return entries.filter((e) => e.data.category === category);
}

export function relatedProjects(
  current: ProjectEntry,
  all: ProjectEntry[],
  limit = 3,
): ProjectEntry[] {
  const others = all.filter((e) => e.id !== current.id && e.data.slug !== current.data.slug);
  const currentTags = new Set(current.data.tags);

  const scored = others.map((entry) => {
    let score = 0;
    if (entry.data.category === current.data.category) score += 10;
    for (const tag of entry.data.tags) {
      if (currentTags.has(tag)) score += 2;
    }
    if (entry.data.featured) score += 1;
    if (entry.data.leadImage !== current.data.leadImage) score += 1;
    return { entry, score };
  });

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.entry.data.title.localeCompare(b.entry.data.title);
  });

  return scored.slice(0, limit).map((s) => s.entry);
}

export function projectHref(slug: string): string {
  return `/our-work/${slug}/`;
}

export function projectLocationLabel(data: ProjectEntry['data']): string | undefined {
  if (data.neighborhood && data.city) return `${data.neighborhood}, ${data.city}`;
  if (data.city) return `${data.city}, Texas`;
  if (data.neighborhood) return data.neighborhood;
  return undefined;
}

export type { ProjectCategoryId };
