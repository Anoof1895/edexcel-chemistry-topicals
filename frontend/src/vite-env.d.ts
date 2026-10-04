/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_IMAGE_BASE_URL?: string;
  readonly VITE_IMAGE_CDN_PREFIXES?: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
