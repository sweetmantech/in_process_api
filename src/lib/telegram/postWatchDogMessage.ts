import { telegramWatchDogBotClient } from './watchDogBotClient';

export const postWatchDogMessage = async (
  chatId: string,
  text: string
): Promise<void> => {
  try {
    await telegramWatchDogBotClient.sendMessage(chatId, text);
  } catch (e) {
    console.error('postWatchDogMessage failed:', e);
  }
};
