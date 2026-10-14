import type { z } from 'zod';
import { ImageResponse } from 'next/og';
import { OG_HEIGHT, OG_WIDTH } from '@/lib/og/consts';
import { Address } from 'viem';
import ArtistOgProfile from '@/components/Og/ArtistOgProfile';
import MomentCardStack from '@/components/Og/MomentCardStack';
import getArtistProfile from '@/lib/artists/getArtistProfile';
import truncateAddress from '@/lib/truncateAddress';
import getArtistTimeline from '@/lib/supabase/in_process_moments/getArtistTimeline';
import getTimelineStats from '@/lib/stats/getTimelineStats';
import getOgMomentCard from '@/lib/og/getOgMomentCard';
import formatOgStatValue from '@/lib/og/formatOgStatValue';
import { SITE_ORIGINAL_URL } from '@/lib/consts';
import getOgFonts from '@/lib/og/getOgFonts';
import { ogArtistQuerySchema } from '@/lib/og/validateOgArtistQuery';

const OG_ARTIST_CARD_COUNT = 3;

const getOgArtistHandler = async ({
  artistAddress,
  chainId,
}: z.infer<typeof ogArtistQuerySchema>) => {
  const artist = artistAddress.toLowerCase();

  const [timeline, profile, stats, fonts] = await Promise.all([
    getArtistTimeline({ artist, limit: OG_ARTIST_CARD_COUNT, chainId }),
    getArtistProfile(artist),
    getTimelineStats(artist),
    getOgFonts(),
  ]);
  if (timeline.error) throw timeline.error;

  const cards = await Promise.all(
    (timeline.data?.moments ?? []).map(getOgMomentCard)
  );

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        paddingTop: 30,
        paddingBottom: 28,
        paddingLeft: 32,
        paddingRight: 0,
        display: 'flex',
        justifyContent: 'space-between',
        background: `url('${SITE_ORIGINAL_URL}/bg-gray.png')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <ArtistOgProfile
        name={profile?.username || truncateAddress(artistAddress as Address)}
        bio={profile?.bio ?? null}
        stats={[
          { value: String(stats.created_count), label: 'Moments' },
          {
            value: `${formatOgStatValue(stats.eth_archived)} ETH`,
            label: 'Archived',
          },
          {
            value: `$${formatOgStatValue(stats.usdc_archived, 0)}`,
            label: 'USDC',
          },
        ]}
      />
      <MomentCardStack cards={cards} />
    </div>,
    {
      width: OG_WIDTH,
      height: OG_HEIGHT,
      fonts: [
        { name: 'Archivo', data: fonts.archivo, weight: 400 },
        { name: 'Spectral', data: fonts.spectral, weight: 400 },
      ],
    }
  );
};

export default getOgArtistHandler;
