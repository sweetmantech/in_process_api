import { getFetchableUrl } from '@/lib/protocolSdk/ipfs/gateway';

// Serves full files reliably, unlike some gateways Wayfinder can pick.
const ARWEAVE_INGEST_GATEWAY = 'https://turbo-gateway.com';

/** Public HTTPS URL Mux can fetch a moment's source video from, or null. */
const getMuxIngestUrl = (uri: string): string | null => {
  if (uri.startsWith('ar://'))
    return `${ARWEAVE_INGEST_GATEWAY}/${uri.slice(5)}`;
  // Legacy moments still pointing at deleted Mux assets have no source left here.
  if (uri.includes('stream.mux.com')) return null;
  const url = getFetchableUrl(uri);
  return url?.startsWith('https://') ? url : null;
};

export default getMuxIngestUrl;
