const getLowTurboCreditAlertTelegramChatIds = (): string[] =>
  (process.env.LOW_TURBO_CREDIT_ALERT_TELEGRAM_CHAT_IDS ?? '')
    .split(',')
    .map((chatId) => chatId.trim())
    .filter(Boolean);

export default getLowTurboCreditAlertTelegramChatIds;
