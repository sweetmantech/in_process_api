import { telegramChatBotClient } from '@/lib/telegram/client';

/** Keep in sync with commandsHandler.ts and TELEGRAM_HELP_MESSAGE (consts.ts). */
export const TELEGRAM_CHAT_BOT_COMMANDS = [
  {
    command: 'start',
    description: 'Connect your Telegram to your In Process account',
  },
  {
    command: 'collections',
    description: 'Choose which collection your moments mint into',
  },
  { command: 'remind', description: 'Toggle posting reminders on or off' },
  {
    command: 'notify',
    description: 'Toggle airdrop notifications on or off',
  },
  { command: 'me', description: 'View the email linked to your account' },
  { command: 'help', description: 'Show this list of commands' },
] as const;

/**
 * Registers the bot's slash commands with Telegram and makes sure the
 * persistent menu button (the list icon next to the message box) is shown,
 * so artists can discover commands without knowing to type /help first.
 */
export async function registerChatBotCommands(): Promise<void> {
  await telegramChatBotClient.setMyCommands([...TELEGRAM_CHAT_BOT_COMMANDS]);
  await telegramChatBotClient.setChatMenuButton({
    menu_button: { type: 'commands' },
  });
}

export default registerChatBotCommands;
