import type { OgMomentCard } from '@/lib/og/getOgMomentCard';
import { OG_CARD_IMAGE_HEIGHT, OG_CARD_IMAGE_WIDTH } from '@/lib/og/consts';

const CAPTION_HEIGHT = 48;
const BACK_CARD_OFFSETS = [
  { left: 58, top: 12, rotate: 3 },
  { left: 104, top: 24, rotate: 7 },
];

const PlayIcon = () => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    style={{ position: 'absolute', top: 77, left: 54 }}
  >
    <path d="M7 4.5v15l12.5-7.5z" fill="#ffffff" fillOpacity="0.92" />
  </svg>
);

const CardMedia = ({ card }: { card: OgMomentCard }) => {
  if (card.image)
    return (
      // eslint-disable-next-line
      <img
        src={card.image}
        width={OG_CARD_IMAGE_WIDTH}
        height={OG_CARD_IMAGE_HEIGHT}
        style={{ objectFit: 'cover' }}
      />
    );
  return (
    <div
      style={{
        display: 'block',
        width: OG_CARD_IMAGE_WIDTH,
        height: OG_CARD_IMAGE_HEIGHT,
        padding: 12,
        backgroundColor: '#f4f1ec',
        fontFamily: 'Spectral',
        fontSize: 9,
        lineHeight: 1.5,
        color: '#4a4741',
        overflow: 'hidden',
      }}
    >
      {card.text ?? ''}
    </div>
  );
};

const BackCard = ({
  card,
  left,
  top,
  rotate,
}: {
  card: OgMomentCard;
  left: number;
  top: number;
  rotate: number;
}) => (
  <div
    style={{
      display: 'flex',
      position: 'absolute',
      left,
      top,
      width: OG_CARD_IMAGE_WIDTH,
      height: OG_CARD_IMAGE_HEIGHT + CAPTION_HEIGHT - 24,
      borderRadius: 10,
      overflow: 'hidden',
      backgroundColor: '#2a2824',
      transform: `rotate(${rotate}deg)`,
      boxShadow: '0 6px 16px rgba(28, 26, 23, 0.18)',
    }}
  >
    <CardMedia card={card} />
  </div>
);

const MomentCardStack = ({ cards }: { cards: OgMomentCard[] }) => {
  const [front, ...back] = cards;
  return (
    <div
      style={{
        display: 'flex',
        position: 'relative',
        width: 236,
        height: '100%',
      }}
    >
      {back
        .slice(0, BACK_CARD_OFFSETS.length)
        .map((card, i) => ({ card, offset: BACK_CARD_OFFSETS[i] }))
        .reverse()
        .map(({ card, offset }, i) => (
          <BackCard key={i} card={card} {...offset} />
        ))}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          position: 'absolute',
          left: 0,
          top: 0,
          width: OG_CARD_IMAGE_WIDTH,
          borderRadius: 10,
          overflow: 'hidden',
          backgroundColor: '#ffffff',
          transform: 'rotate(-3deg)',
          boxShadow: '0 10px 24px rgba(28, 26, 23, 0.28)',
        }}
      >
        {front ? (
          <div style={{ display: 'flex', position: 'relative' }}>
            <CardMedia card={front} />
            {front.isVideo && front.image && <PlayIcon />}
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: OG_CARD_IMAGE_WIDTH,
              height: OG_CARD_IMAGE_HEIGHT,
              backgroundColor: '#e0ddd8',
              fontFamily: 'Spectral',
              fontSize: 13,
              color: '#605f5c',
            }}
          >
            No moments yet
          </div>
        )}
        {front && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              height: CAPTION_HEIGHT,
              paddingLeft: 10,
              paddingRight: 10,
            }}
          >
            <div
              style={{
                display: 'block',
                fontFamily: 'Spectral',
                fontSize: 12,
                color: '#1c1a17',
                lineClamp: 1,
              }}
            >
              {front.name}
            </div>
            <div
              style={{
                display: 'flex',
                marginTop: 3,
                fontFamily: 'Archivo',
                fontSize: 6.5,
                letterSpacing: 1,
                color: '#b5832a',
              }}
            >
              {front.price ? `LATEST · ${front.price}` : 'LATEST'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MomentCardStack;
