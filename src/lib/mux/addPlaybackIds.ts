const MUX_PLAYBACK_ID_PATTERN = /stream\.mux\.com\/([^/.]+)/g;

const addPlaybackIds = (value: unknown, ids: Set<string>) => {
  if (typeof value !== 'string') return;
  for (const match of value.matchAll(MUX_PLAYBACK_ID_PATTERN)) {
    ids.add(match[1]);
  }
};

export default addPlaybackIds;
