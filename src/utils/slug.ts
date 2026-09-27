export function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

  return base || `affiliate-${Date.now()}`;
}

export function uniqueSlug(base: string, attempt: number): string {
  if (attempt === 0) return base;
  return `${base}-${attempt}`.slice(0, 100);
}
