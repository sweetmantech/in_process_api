import { NextResponse } from 'next/server';
import { ADMIN_ADDRESSES } from '@/lib/consts';
import getAllEmails from '@/lib/privy/getAllEmails';
import selectWallets from '@/lib/supabase/in_process_wallets/selectWallets';
import lookupEmail from '@/lib/emails/lookupEmail';

const getEmailsHandler = async (
  callerAddress: string,
  artistAddress?: string,
  cursor?: string,
  limit?: number
) => {
  const isAdmin = ADMIN_ADDRESSES.includes(callerAddress.toLowerCase());

  if (!isAdmin) {
    return lookupEmail(callerAddress);
  }

  if (artistAddress) {
    return lookupEmail(artistAddress);
  }

  const { emails, next_cursor } = await getAllEmails(cursor, limit);

  const privyAddresses = emails.map((e) => e.address.toLowerCase());
  const { data: privyRows } = privyAddresses.length
    ? await selectWallets({ addresses: privyAddresses })
    : { data: [] };

  const artistIds = [
    ...new Set(privyRows?.map((r) => r.artist_id).filter(Boolean) as string[]),
  ];
  const { data: externalRows } = artistIds.length
    ? await selectWallets({ artistIds, type: 'external' })
    : { data: [] };

  const artistIdToExternal = Object.fromEntries(
    externalRows?.map((r) => [r.artist_id, r.address]) ?? []
  );
  const privyToArtistId = Object.fromEntries(
    privyRows?.map((r) => [r.address.toLowerCase(), r.artist_id]) ?? []
  );
  const privyToUsername = Object.fromEntries(
    privyRows?.map((r) => [
      r.address.toLowerCase(),
      r.artist?.username ?? null,
    ]) ?? []
  );

  const enriched = emails.map((e) => {
    const artistId = privyToArtistId[e.address.toLowerCase()];
    return {
      ...e,
      artist_address: artistId ? (artistIdToExternal[artistId] ?? null) : null,
      username: privyToUsername[e.address.toLowerCase()] ?? null,
    };
  });

  return NextResponse.json({ emails: enriched, next_cursor });
};

export default getEmailsHandler;
