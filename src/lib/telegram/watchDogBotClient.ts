import TelegramBot from 'node-telegram-bot-api';

if (!process.env.TELEGRAM_WATCH_DOG_BOT_TOKEN) {
  throw new Error(
    'TELEGRAM_WATCH_DOG_BOT_TOKEN environment variable is required'
  );
}

export const telegramWatchDogBotClient = new TelegramBot(
  process.env.TELEGRAM_WATCH_DOG_BOT_TOKEN,
  { polling: false }
);

telegramWatchDogBotClient.on('error', (error: Error) => {
  console.error('Telegram watch dog bot client error:', error);
});
