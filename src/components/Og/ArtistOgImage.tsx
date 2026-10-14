import ArtistOgProfile, { type ArtistOgStat } from './ArtistOgProfile';
import MomentCardStack from './MomentCardStack';
import type { OgMomentCard } from '@/lib/og/getOgMomentCard';
import { OG_INK } from '@/lib/og/consts';
import { SITE_ORIGINAL_URL } from '@/lib/consts';

const ArtistOgImage = ({
  name,
  bio,
  stats,
  cards,
}: {
  name: string;
  bio: string | null;
  stats: ArtistOgStat[];
  cards: OgMomentCard[];
}) => (
  <div
    style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      position: 'relative',
      color: OG_INK,
      backgroundColor: '#e5e2dd',
      backgroundImage: `url('${SITE_ORIGINAL_URL}/bg-gray.png')`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    }}
  >
    <ArtistOgProfile name={name} bio={bio} stats={stats} />
    <MomentCardStack cards={cards} />
  </div>
);

export default ArtistOgImage;
