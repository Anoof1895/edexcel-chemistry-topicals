import { QuestionItem } from '../types';

/**
 * Utility for resolving question and mark scheme image URLs.
 * Reads VITE_R2_BASE_URL / VITE_R2_PUBLIC_URL / VITE_IMAGE_BASE_URL from Vite environment variables
 * for Cloudflare R2 / CDN hosting.
 * Falls back to local relative paths (e.g. /extracted/questions/...) when unset.
 */
export const IMAGE_BASE_URL: string = (
  import.meta.env.VITE_R2_BASE_URL ||
  import.meta.env.VITE_R2_PUBLIC_URL ||
  import.meta.env.VITE_IMAGE_BASE_URL ||
  ''
).replace(/\/+$/, '');

/**
 * Path prefixes that have actually been uploaded to the CDN bucket.
 * Paths outside these prefixes are served locally from /public.
 * Override with a comma-separated VITE_IMAGE_CDN_PREFIXES, e.g. "/extracted/,/crops_physics/".
 */
export const IMAGE_CDN_PREFIXES: string[] = (
  import.meta.env.VITE_IMAGE_CDN_PREFIXES || '/extracted/,/crops_physics/,/crops_math/'
)
  .split(',')
  .map((p: string) => p.trim())
  .filter(Boolean)
  .map((p: string) => (p.startsWith('/') ? p : `/${p}`));

/** Safely URI-encodes each path segment without double-encoding. */
function encodePathSegments(rawPath: string): string {
  const [pathname, query] = rawPath.split('?');
  const encodedPathname = pathname
    .split('/')
    .map((segment) => {
      if (!segment) return '';
      try {
        return encodeURIComponent(decodeURIComponent(segment));
      } catch {
        return encodeURIComponent(segment);
      }
    })
    .join('/');
  return query ? `${encodedPathname}?${query}` : encodedPathname;
}

/** Normalizes a dataset image path to a root-relative local URL. */
export function getLocalImageUrl(path: string | null | undefined): string {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return encodePathSegments(normalized);
}

/**
 * Returns the full image URL.
 * - If path is already an absolute URL (http:// or https://), returns it unchanged.
 * - If IMAGE_BASE_URL is set AND the path lives under a CDN-hosted prefix, prepends the base URL.
 * - Otherwise returns the clean local relative path (served by Vite / static hosting from /public).
 */
export function getFullImageUrl(path: string | null | undefined): string {
  const cleanPath = getLocalImageUrl(path);
  if (!cleanPath || cleanPath.startsWith('http://') || cleanPath.startsWith('https://')) {
    return cleanPath;
  }

  // When running in local dev, allow loading newly extracted crops directly from local server
  if (import.meta.env.DEV) {
    if (cleanPath.startsWith('/crops_math/')) {
      return cleanPath;
    }
  }

  if (!IMAGE_BASE_URL) return cleanPath;
  const onCdn = IMAGE_CDN_PREFIXES.some((prefix) => cleanPath.startsWith(prefix));
  return onCdn ? `${IMAGE_BASE_URL}${cleanPath}` : cleanPath;
}

/**
 * Universal image resolver supporting both path strings and QuestionItem objects.
 * Safely extracts question image or mark scheme image paths across all naming conventions.
 */
export function resolveImageUrl(
  pathOrQuestion: string | Partial<QuestionItem> | null | undefined,
  subject?: string,
  isMarkScheme: boolean = false
): string {
  if (!pathOrQuestion) {
    return '';
  }

  let rawPath: string = '';

  if (typeof pathOrQuestion === 'object') {
    const q = pathOrQuestion;
    if (isMarkScheme) {
      rawPath =
        q.markSchemeImagePath ||
        q.mark_scheme_image_url ||
        q.mark_scheme_image ||
        q.ms_image ||
        q.ms_image_url ||
        q.ms_crop_path ||
        q.ms_image_path ||
        q.mark_scheme_image_path ||
        '';
    } else {
      rawPath =
        q.questionImagePath ||
        q.question_image_url ||
        q.question_image ||
        q.image ||
        q.image_url ||
        q.crop_path ||
        q.image_path ||
        '';
    }
  } else if (typeof pathOrQuestion === 'string') {
    rawPath = pathOrQuestion.trim();
  }

  if (!rawPath) {
    if (import.meta.env.DEV && !isMarkScheme) {
      console.warn('[resolveImageUrl] Could not determine image path', { pathOrQuestion, subject });
    }
    return '';
  }

  if (rawPath.startsWith('http://') || rawPath.startsWith('https://')) {
    return rawPath;
  }

  return getFullImageUrl(rawPath);
}

/** Convenience helper for question image resolution */
export function resolveQuestionImageUrl(
  questionOrPath: string | Partial<QuestionItem> | null | undefined,
  subject?: string
): string {
  return resolveImageUrl(questionOrPath, subject, false);
}

/** Convenience helper for mark scheme image resolution */
export function resolveMarkSchemeImageUrl(
  questionOrPath: string | Partial<QuestionItem> | null | undefined,
  subject?: string
): string {
  return resolveImageUrl(questionOrPath, subject, true);
}
