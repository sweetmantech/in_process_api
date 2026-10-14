import type { Attachment } from 'chat';
import uploadFileToSupabase from '@/lib/supabase/storage/uploadFileToSupabase';
import uploadJsonToSupabase from '@/lib/supabase/storage/uploadJsonToSupabase';
import uploadVideoToMux from '@/lib/mux/uploadVideoToMux';
import fetchMuxThumbnail from '@/lib/mux/fetchMuxThumbnail';
import getTelegramFilePath from '@/lib/telegram/chat/attachment/getTelegramFilePath';
import getMimeTypeFromFilePath from '@/lib/telegram/chat/attachment/getMimeTypeFromFilePath';
import toFile from '@/lib/telegram/chat/attachment/toFile';

const uploadVideoAttachment = async (
  attachment: Attachment,
  fileId: string,
  name: string
) => {
  if (!attachment.fetchData) throw new Error('Attachment has no fetchData');

  const [buffer, filePath] = await Promise.all([
    attachment.fetchData(),
    getTelegramFilePath(fileId),
  ]);
  const mimeType = attachment.mimeType ?? getMimeTypeFromFilePath(filePath);

  const { playbackUrl, downloadUrl } = await uploadVideoToMux(buffer, mimeType);

  let imageUri = '';
  const thumbBuffer = await fetchMuxThumbnail(playbackUrl);
  if (thumbBuffer) {
    const thumbFile = toFile(thumbBuffer, `${name}-thumb`, 'image/jpeg');
    imageUri = await uploadFileToSupabase(thumbFile);
  }

  const jsonObject = {
    name,
    ...(imageUri && { image: imageUri }),
    animation_url: playbackUrl,
    content: { mime: mimeType, uri: downloadUrl || playbackUrl },
  };
  const uri = await uploadJsonToSupabase(jsonObject);

  return { uri, mimeType, mediaUri: playbackUrl };
};

export default uploadVideoAttachment;
