export interface CarouselItem {
  type: string;
  url: string;
  preview: string;
}

// Deliberately not in @/lib/consts: that module has top-level Buffer usage
// (ARWEAVE_KEY parsing), which crashes when evaluated inside the Workflow
// SDK's sandboxed context (no Node globals) — migrateAssetToArweave.ts
// imports this constant directly, so it must stay in a side-effect-free file.
export const INSTAGRAM_CAROUSEL_MIME = 'application/vnd.inprocess.carousel+json';
