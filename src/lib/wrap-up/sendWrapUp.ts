import { telegramChatBotClient } from '@/lib/telegram/client';

const sendWrapUp = async ({
  chatId,
  username,
  telegramCount,
  webCount,
  apiCount,
  smsCount,
}: {
  chatId: string;
  username: string;
  telegramCount: number;
  webCount: number;
  apiCount: number;
  smsCount: number;
}) => {
  const total = telegramCount + webCount + apiCount + smsCount;

  const text = [
    `📊 Weekly Wrap-Up 📊`,
    ``,
    `Great week, @${username}! You posted ${total} moment${total === 1 ? '' : 's'} this week.`,
    ``,
    `Keep creating. See you next Sunday! 🙌`,
  ].join('\n');

  await telegramChatBotClient.sendMessage(chatId, text);
};

export default sendWrapUp;
