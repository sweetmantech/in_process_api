const getMuxPlaybackIdFromUrl = (playbackUrl: string): string | null =>
  playbackUrl.match(/stream\.mux\.com\/([^/.]+)/)?.[1] ?? null;

export default getMuxPlaybackIdFromUrl;
