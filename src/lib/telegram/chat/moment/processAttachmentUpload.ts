import type { Attachment } from 'chat';
import uploadPhotoAttachment from './uploadPhotoAttachment';
import uploadVideoAttachment from './uploadVideoAttachment';
import uploadAudioAttachment from './uploadAudioAttachment';

const processAttachmentUpload = async (
  attachment: Attachment,
  fileId: string,
  name: string
) => {
  if (attachment.type === 'image') {
    return uploadPhotoAttachment(attachment, fileId, name);
  }
  if (attachment.type === 'video') {
    return uploadVideoAttachment(attachment, fileId, name);
  }
  if (attachment.type === 'audio') {
    return uploadAudioAttachment(attachment, fileId, name);
  }
  throw new Error(`Unsupported attachment type: ${attachment.type}`);
};

export default processAttachmentUpload;
