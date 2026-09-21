import { v4 as uuidv4 } from 'uuid';
import uploadFileToSupabase from '@/lib/supabase/storage/uploadFileToSupabase';

export interface UploadedRemoteFile {
  url: string;
  mime: string;
}

// Instagram's CDN URLs (displayUrl/videoUrl) carry signed, expiring tokens,
// so this must run immediately after fetching them from Apify — re-fetching
// the same URL later will 403/404 once it expires.
const uploadRemoteFileToSupabase = async (
  remoteUrl: string
): Promise<UploadedRemoteFile> => {
  const response = await fetch(remoteUrl);
  if (!response.ok) {
    throw new Error(`Failed to download ${remoteUrl}: ${response.status}`);
  }

  const mime =
    response.headers.get('content-type') || 'application/octet-stream';
  const buffer = Buffer.from(await response.arrayBuffer());
  const file = new File([buffer], uuidv4(), { type: mime });

  const url = await uploadFileToSupabase(file);
  return { url, mime };
};

export default uploadRemoteFileToSupabase;
