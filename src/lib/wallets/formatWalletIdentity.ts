import truncateAddress from '@/lib/truncateAddress';

/** "username (0x1234…5678)", or just the truncated address when no artist is linked. */
const formatWalletIdentity = (address: string, username?: string | null) =>
  username
    ? `${username} (${truncateAddress(address)})`
    : truncateAddress(address);

export default formatWalletIdentity;
