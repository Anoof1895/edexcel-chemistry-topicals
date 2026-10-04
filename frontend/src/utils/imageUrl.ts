/**
 * Utility for resolving question and mark scheme image URLs.
 * Reads VITE_IMAGE_BASE_URL from Vite environment variables for Cloudflare R2 / CDN hosting.
 * Falls back to local relative paths (e.g. /extracted/questions/...) when unset.
 */
export const IMAGE_BASE_URL: string = (
  import.meta.env.VITE_IMAGE_BASE_URL || ''
).replace(/\/+$/, '');

/**
 * Path prefixes that have actually been uploaded to the CDN bucket.
 * Paths outside these prefixes (e.g. /crops_physics/) are served locally from /public.
 * Override with a comma-separated VITE_IMAGE_CDN_PREFIXES, e.g. "/extracted/,/crops_physics/".
 */
export const IMAGE_CDN_PREFIXES: string[] = (
  import.meta.env.VITE_IMAGE_CDN_PREFIXES || '/extracted/,/crops_physics/'
)
  .split(',')
  .map((p: string) => p.trim())
  .filter(Boolean)
  .map((p: string) => (p.startsWith('/') ? p : `/${p}`));

/** Normalizes a dataset image path to a root-relative local URL. */
export function getLocalImageUrl(path: string | null | undefined): string {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return path.startsWith('/') ? path : `/${path}`;
}

/**
 * Returns the full image URL.
 * - If path is already an absolute URL (http:// or https://), returns it unchanged.
 * - If IMAGE_BASE_URL is set AND the path lives under a CDN-hosted prefix, prepends the base URL.
 * - Otherwise returns the clean local relative path (served by Vite / static hosting from /public).
 */
export function getFullImageUrl(path: string | null | undefined): string {
  const cleanPath = getLocalImageUrl(path);
  if (!cleanPath || cleanPath.startsWith('http')) return cleanPath;
  if (!IMAGE_BASE_URL) return cleanPath;
  const onCdn = IMAGE_CDN_PREFIXES.some((prefix) => cleanPath.startsWith(prefix));
  return onCdn ? `${IMAGE_BASE_URL}${cleanPath}` : cleanPath;
}
