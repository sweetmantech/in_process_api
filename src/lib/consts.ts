import { base, baseSepolia, mainnet, sepolia } from 'viem/chains';
import { Address } from 'viem';

export const INPROCESS_GROUP_CHAT_ID = '-1002592953370';

export const IS_TESTNET =
  process.env.VERCEL_ENV === 'preview' ||
  process.env.VERCEL_ENV === 'development'
    ? true
    : false;

export const PRIVY_PROJECT_SECRET = process.env.PRIVY_PROJECT_SECRET as string;

// Wagmi
export const CHAIN = IS_TESTNET ? baseSepolia : base;
export const CHAIN_ID = CHAIN.id;

/** Zora collect / inprocess URL path segment by `chain_id`. */
export const SHORT_CHAIN_NAME: Record<number, 'base' | 'bsep' | 'eth'> = {
  [base.id]: 'base',
  [baseSepolia.id]: 'bsep',
  [mainnet.id]: 'eth',
};
// Zora
export const REFERRAL_RECIPIENT = '0x749B7b7A6944d72266Be9500FC8C221B6A7554Ce';
export const ROYALTY_BPS_DEFAULT = 1000; // Default royalty bps (10%)

export const PROCESS_COLLECTION_URI =
  'ar://FrDLosTVZP54g8xvLkGG0aWDGrKV46dDAz5umTJkiyA';
export const PROCESS_COLLECTION_NAME = 'Process';

export const PERMISSION_BIT_ADMIN = 2;

export const USDC_ADDRESS: Record<number, Address> = {
  [base.id]: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  [baseSepolia.id]: '0x14196F08a4Fa0B66B7331bC40dd6bCd8A1dEeA9F',
} as const;

export const SITE_ORIGINAL_URL = IS_TESTNET
  ? 'https://in-process-git-test-sweetmantechs-projects.vercel.app'
  : 'https://inprocess.world';

export const TELNYX_SECONDARY_PHONE_NUMBER = '+15135971101';
export const TELNYX_TOLL_FREE_PHONE_NUMBER = '+18885993909';
export const TELNYX_MESSAGING_PROFILE_ID =
  '40019b4c-b5af-4052-966b-3f7546c2e7c0';

export const ARWEAVE_KEY = process.env.ARWEAVE_KEY
  ? JSON.parse(Buffer.from(process.env.ARWEAVE_KEY, 'base64').toString())
  : null;

export const ADMIN_ADDRESSES = [
  '0xaf1452d289e22fbd0dea9d5097353c72a90fac33',
  '0xcfbf34d385ea2d5eb947063b67ea226dcda3dc38',
  '0x7b753919b953b1021a33f55671716dc13c1eae08',
  '0x6e786fcfcb98da9df87ab0b7a2d64067c90daba9',
];

export const SOUND_METADATA_ADDRESS: Address =
  '0x0000000000f5A96Dc85959cAeb0Cfe680f108FB5';

export const ZORA_MEDIA_ADDRESS: Address =
  '0xabEFBc9fD2F806065b4f3C237d4b59D9A97Bcac7';

const INDEXER_ID = '87ca119';
export const GRPC_ENDPOINT = `https://indexer.hyperindex.xyz/${INDEXER_ID}/v1/graphql`;

export const BATCH_SIZE = 100;
export const PAGE_LIMIT = 1000;

export const INDEX_INTERVAL_MS = 1000;
export const INDEX_INTERVAL_EMPTY_MS = 1500;

export const REDIS_TIMESTAMP_KEY = 'indexer:cached_timestamps';

export const NUDGE_PERIOD_ACTION_ID = 'remind_period';

export const NUDGE_PERIODS: Record<
  string,
  { buttonLabel: string; description: string }
> = {
  '1': { buttonLabel: 'Every day', description: '1 day' },
  '3': { buttonLabel: 'Every 3 days', description: '3 days' },
  '7': { buttonLabel: 'Every week', description: 'a week' },
};

export const FREE_TIER_MAX_BYTES = 5 * 1024 * 1024;
export const FREE_UPLOADS_PER_MONTH = 11;

export const NOUNS_GOVERNOR_ADDRESS: Record<number, Address> = {
  [mainnet.id]: '0x6f3e6272a167e8accb32072d08e0957f9c79223d',
  [sepolia.id]: '0x35d2670d7c8931aacdd37c89ddcb0638c3c44a57',
};

/** In Process Comments proxy (free comments; not Zora's 0x7777… deployment). */
export const COMMENTS_ADDRESS: Record<number, Address> = {
  [base.id]: '0x89d1e8b71330cd1d5d651b2d3a62472e10dd567d',
  [baseSepolia.id]: '0x3836fa55a5d35445d6ede75b4f0991e850546dec',
};

/** CDP account / smart-account name for the DELEGATE_COMMENTER operator. */
export const IN_PROCESS_COMMENTER_ACCOUNT_NAME = 'in-process-commenter';

export const SUPABASE_STORAGE_BUCKET = 'in_process_files';

export const APIFY_INSTAGRAM_ACTOR = 'apify~instagram-post-scraper';
