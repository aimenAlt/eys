import { getCollection } from 'astro:content';

/**
 * Alt text and town for a project photo, read from the project's content entry
 * (backlog 013: never hand-type alt text or towns that already have a source).
 */
export async function projectImageInfo(projectSlug: string, src: string): Promise<{ alt: string; city?: string }> {
  const projects = await getCollection('projects');
  const entry = projects.find((p) => p.id === projectSlug || p.data.slug === projectSlug);
  if (!entry) throw new Error(`homeRedesign: no project entry "${projectSlug}"`);
  const image = entry.data.images.find((img) => img.src === src);
  if (!image) throw new Error(`homeRedesign: "${src}" is not an image of project "${projectSlug}"`);
  return { alt: image.alt, city: entry.data.city };
}
