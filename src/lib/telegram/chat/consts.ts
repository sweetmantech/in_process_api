/** Max 2 chars: callback_data budget is exactly 64 bytes when paired with a 42-byte address value. */
export const COLLECTION_SELECT_ACTION_ID = 'sc';

/** Clears thread collection selection state (compact id for Telegram callback limits). */
export const COLLECTION_SELECTION_CANCEL_ACTION_ID = 'cx';

export const COLLECTION_SET_DEFAULT_ACTION_ID = 'sd';

/** Value is the next page number (integer string). */
export const COLLECTIONS_LOAD_MORE_ACTION_ID = 'load_more_collections';

/** In-memory state key (namespaced to the thread by the chat runtime). */
export const TELEGRAM_SELECTED_COLLECTION_KEY = 'selected_collection_address';

/** Set while the bot is waiting for an unconnected Telegram user to reply with their In Process email. */
export const TELEGRAM_PENDING_EMAIL_KEY = 'pending_email';

/** How long a user has to reply with their email before the prompt expires. */
export const TELEGRAM_PENDING_EMAIL_TTL_MS = 10 * 60 * 1_000;

/** Set while the bot is waiting for the Telegram user to reply with their emailed verification code. */
export const TELEGRAM_PENDING_CODE_KEY = 'pending_code';

/** How long a user has to reply with the verification code before it expires. */
export const TELEGRAM_PENDING_CODE_TTL_MS = 10 * 60 * 1_000;

/** Debounce window for batching media (real Telegram albums and synthesized ungrouped bursts). */
export const MEDIA_GROUP_WINDOW_MS = 10_000;

/** Thread state key holding the plain-text body awaiting Yes/No confirmation as a text moment. */
export const TELEGRAM_PENDING_TEXT_KEY = 'pending_text_body';

/** How long a pending text body is kept before the Yes/No prompt expires. */
export const TELEGRAM_PENDING_TEXT_TTL_MS = 10 * 60 * 1_000;

/** Confirms the pending plain-text message should be minted as a writing moment. */
export const TEXT_POST_CONFIRM_YES_ACTION_ID = 'ty';

/** Declines minting the pending plain-text message as a writing moment. */
export const TEXT_POST_CONFIRM_NO_ACTION_ID = 'tn';

/** Shown when a connected user sends plain text with no media / YouTube link. */
export const TELEGRAM_TEXT_POST_PROMPT = 'Is this a text post?';

/** Shown when the user declines the text-post confirmation. */
export const TELEGRAM_TEXT_POST_CANCELLED_MESSAGE = 'Ok, cancelled.';

/** Shown when Yes is pressed but the pending body expired or was already used. */
export const TELEGRAM_TEXT_POST_EXPIRED_MESSAGE =
  'That text expired or was already posted. Send it again to create a text moment.';

/** Shown when a Telegram user without a linked account sends any message. */
export const TELEGRAM_NOT_CONNECTED_MESSAGE =
  'Welcome to In Process! To get started, please reply with the email you use for In Process so we can connect your Telegram.';

/** Shown when the reply to the email prompt isn't a valid email address. */
export const TELEGRAM_INVALID_EMAIL_MESSAGE =
  "That doesn't look like a valid email address. Please try again.";

/** Shown after a verification code has been emailed, whether or not an artist was matched (avoids leaking which emails have an account). */
export const TELEGRAM_CODE_SENT_MESSAGE =
  "We've sent a 6-digit verification code to that email. Please reply with the code to confirm it's yours.";

/** Shown when the reply to the code prompt is malformed or Privy rejects the code. */
export const TELEGRAM_INVALID_CODE_MESSAGE =
  "That code doesn't look right. Please check your email and try again.";

/** Shown once a Telegram account is successfully connected, whether to an existing or newly created artist. */
export const telegramConnectedMessage = (username: string | null) =>
  `You're all set! Your Telegram is now connected to your In Process account${username ? ` (${username})` : ''}. You can now send photos, videos, YouTube links, or plain text to create moments.`;

/** Fallback when a message is not media, YouTube, or plain text suitable for a text moment. */
export const TELEGRAM_MOMENT_HELP_MESSAGE =
  'To post moments, please send a photo or video along with a caption, a YouTube link, or plain text.';

/** Shown for /help — table of slash commands (aligned with FAQ telegram section). */
export const TELEGRAM_HELP_MESSAGE = `Available commands:

/start        – if your Telegram isn't linked yet, starts account connect (asks for your In Process email, then a 6-digit verification code; creates an account if needed). If already connected, shows a welcome confirming you're linked and ready to post
/collections  – choose which collection your next moments will be minted into
/remind       – toggle posting nudges on/off; when turning on, pick every day / every 3 days / every week
/notify       – toggle airdrop notifications on/off; get alerted when someone sends your wallet an airdrop
/me           – view the email address linked to your In Process account
/help         – show this list of commands

Once connected, you can also create moments by sending a photo or video (optional caption), a YouTube link, or plain text (Yes/No to confirm a text post).`;
