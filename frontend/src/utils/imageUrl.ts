/**
 * Utility for resolving question and mark scheme image URLs.
 * Reads VITE_IMAGE_BASE_URL from Vite environment variables for Cloudflare R2 / CDN hosting.
 * Falls back to local relative paths (e.g. /extracted/questions/...) when unset.
 */
export const IMAGE_BASE_URL: string = (
  import.meta.env.VITE_IMAGE_BASE_URL || ''
).replace(/\/+$/, '');

/**
 * Returns the full image URL.
 * - If path is already an absolute URL (http:// or https://), returns it unchanged.
 * - If IMAGE_BASE_URL is set, prepends it to the path (e.g. https://pub-xxx.r2.dev/extracted/questions/...).
 * - If IMAGE_BASE_URL is empty, returns the clean local relative path for offline development.
 */
export function getFullImageUrl(path: string | null | undefined): string {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (!IMAGE_BASE_URL) {
    return cleanPath;
  }
  return `${IMAGE_BASE_URL}${cleanPath}`;
}
