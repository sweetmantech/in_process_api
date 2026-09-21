import { v4 as uuidv4 } from 'uuid';
import getBlob from '@/lib/getBlob';
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
  const { blob, type } = await getBlob(remoteUrl);
  const file = new File([blob], uuidv4(), { type });

  const url = await uploadFileToSupabase(file);
  return { url, mime: type };
};

export default uploadRemoteFileToSupabase;
