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

/**
 * Explicit cache-busting version query parameter map for re-cropped or updated images.
 * Keyed by question ID, image filename, or relative image path.
 */
export const IMAGE_VERSIONS: Record<string, string> = {
  wch11_2025_june_q14_b: '20261106_recrop',
  'wch11_2025_june_q14_b.png': '20261106_recrop',
  '/extracted/questions/wch11_2025_june_q14_b.png': '20261106_recrop',
};

/**
 * Applies a cache-busting version query string (?v=...) if known in IMAGE_VERSIONS
 * and not already present on the URL.
 */
export function applyImageVersion(rawPath: string | null | undefined, keyOrId?: string): string {
  if (!rawPath) return '';
  if (rawPath.includes('?v=') || rawPath.includes('&v=')) {
    return rawPath;
  }
  let version: string | undefined;
  if (keyOrId && IMAGE_VERSIONS[keyOrId]) {
    version = IMAGE_VERSIONS[keyOrId];
  } else {
    const clean = rawPath.split('?')[0];
    const filename = clean.substring(clean.lastIndexOf('/') + 1);
    const baseWithoutExt = filename.replace(/\.[^/.]+$/, '');
    version = IMAGE_VERSIONS[clean] || IMAGE_VERSIONS[filename] || IMAGE_VERSIONS[baseWithoutExt];
  }
  if (version) {
    const sep = rawPath.includes('?') ? '&' : '?';
    return `${rawPath}${sep}v=${version}`;
  }
  return rawPath;
}

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

/** Normalizes a dataset image path to a root-relative local URL, preserving query parameters. */
export function getLocalImageUrl(path: string | null | undefined): string {
  if (!path) return '';
  const versioned = applyImageVersion(path);
  if (versioned.startsWith('http://') || versioned.startsWith('https://')) return versioned;
  const normalized = versioned.startsWith('/') ? versioned : `/${versioned}`;
  return encodePathSegments(normalized);
}

/**
 * Returns the Cloudflare R2 CDN URL for a path if hosted on CDN, otherwise returns local URL.
 */
export function getCdnImageUrl(path: string | null | undefined): string {
  const cleanPath = getLocalImageUrl(path);
  if (!cleanPath || cleanPath.startsWith('http://') || cleanPath.startsWith('https://')) {
    return cleanPath;
  }
  if (!IMAGE_BASE_URL) return cleanPath;
  const pathname = cleanPath.split('?')[0];
  const onCdn = IMAGE_CDN_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  return onCdn ? `${IMAGE_BASE_URL}${cleanPath}` : cleanPath;
}

/**
 * Returns the default full image URL.
 * - In local development (import.meta.env.DEV), prefers local static assets served from
 *   /public (e.g. /extracted/ Chemistry crops or /crops_math/) so newly generated or
 *   re-cropped files are instantly viewable on localhost without Cloudflare CDN staleness.
 *   (Can be overridden with VITE_FORCE_R2=true).
 * - In production, returns the Cloudflare R2 CDN URL.
 */
export function getFullImageUrl(path: string | null | undefined): string {
  const cleanPath = getLocalImageUrl(path);
  if (!cleanPath || cleanPath.startsWith('http://') || cleanPath.startsWith('https://')) {
    return cleanPath;
  }

  // When running in local development, prefer local static assets from Vite's /public directory
  const forceR2 = import.meta.env.VITE_FORCE_R2 === 'true';
  if (import.meta.env.DEV && !forceR2) {
    const pathname = cleanPath.split('?')[0];
    if (pathname.startsWith('/extracted/') || pathname.startsWith('/crops_math/')) {
      return cleanPath;
    }
  }

  return getCdnImageUrl(cleanPath);
}

/**
 * Universal image resolver supporting both path strings and QuestionItem objects.
 * Safely extracts question image or mark scheme image paths across all naming conventions,
 * and attaches cache-busting version parameters when applicable.
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
  let questionId: string = '';

  if (typeof pathOrQuestion === 'object') {
    const q = pathOrQuestion;
    questionId = q.id || '';
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

  const versionedPath = applyImageVersion(rawPath, questionId);

  if (versionedPath.startsWith('http://') || versionedPath.startsWith('https://')) {
    return versionedPath;
  }

  return getFullImageUrl(versionedPath);
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
