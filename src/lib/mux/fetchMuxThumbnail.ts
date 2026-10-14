import getMuxPlaybackIdFromUrl from './getMuxPlaybackIdFromUrl';

const fetchMuxThumbnail = async (
  playbackUrl: string
): Promise<Buffer | null> => {
  const playbackId = getMuxPlaybackIdFromUrl(playbackUrl);
  if (!playbackId) return null;

  try {
    const res = await fetch(
      `https://image.mux.com/${playbackId}/thumbnail.jpg?time=0`
    );
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
};

export default fetchMuxThumbnail;
