import telegramChatBot from '@/lib/telegram/chat/bot';
import { registerOnNewMention } from './onNewMention';
import { registerOnNudgePeriod } from './onNudgePeriod';
import { registerOnCollectionSelect } from './onCollectionSelect';
import { registerOnCollectionSelectionCancel } from './onCollectionSelectionCancel';
import { registerOnCollectionSetDefault } from './onCollectionSetDefault';
import { registerOnCollectionsLoadMore } from './onCollectionsLoadMore';
import { registerOnTextPostConfirmYes } from './onTextPostConfirmYes';
import { registerOnTextPostConfirmNo } from './onTextPostConfirmNo';

registerOnNewMention(telegramChatBot);
registerOnNudgePeriod(telegramChatBot);
registerOnCollectionSelect(telegramChatBot);
registerOnCollectionSelectionCancel(telegramChatBot);
registerOnCollectionSetDefault(telegramChatBot);
registerOnCollectionsLoadMore(telegramChatBot);
registerOnTextPostConfirmYes(telegramChatBot);
registerOnTextPostConfirmNo(telegramChatBot);
