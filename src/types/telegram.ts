import type { createTelegramChatBot } from '@/lib/telegram/chat/bot';

export type TelegramChatBot = ReturnType<typeof createTelegramChatBot>['bot'];

export interface TelegramThreadState extends Record<string, unknown> {}

export interface PendingMediaGroupAsset {
  fileId: string;
  name: string;
  mimeType?: string;
  attachmentType: 'image' | 'video' | 'file' | 'audio';
}

export interface MessageAttachment {
  buffer: Buffer;
  caption: string;
}

export interface RawMediaFile {
  arrayBuffer(): Promise<ArrayBuffer>;
  name: string;
  type: string;
}
