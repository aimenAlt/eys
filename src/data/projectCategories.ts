export const PROJECT_CATEGORY_IDS = [
  'tv-media-walls',
  'kitchens-cabinetry',
  'carpentry-built-ins',
  'fixtures-installations',
  'repairs-improvements',
  'outdoor-projects',
] as const;

export type ProjectCategoryId = (typeof PROJECT_CATEGORY_IDS)[number];

export type ProjectCategory = {
  id: ProjectCategoryId;
  label: string;
};

export const projectCategories: ProjectCategory[] = [
  { id: 'tv-media-walls', label: 'TV & Media Walls' },
  { id: 'kitchens-cabinetry', label: 'Kitchens & Cabinetry' },
  { id: 'carpentry-built-ins', label: 'Carpentry & Built-Ins' },
  { id: 'fixtures-installations', label: 'Fixtures & Installations' },
  { id: 'repairs-improvements', label: 'Repairs & Improvements' },
  { id: 'outdoor-projects', label: 'Outdoor Projects' },
];

const labelById = Object.fromEntries(
  projectCategories.map((c) => [c.id, c.label]),
) as Record<ProjectCategoryId, string>;

export function isProjectCategoryId(value: string): value is ProjectCategoryId {
  return (PROJECT_CATEGORY_IDS as readonly string[]).includes(value);
}

export function projectCategoryLabel(id: ProjectCategoryId | string): string {
  if (isProjectCategoryId(id)) return labelById[id];
  return id;
}
