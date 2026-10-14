import type { OgMomentCard } from '@/lib/og/getOgMomentCard';
import {
  OG_CARD_IMAGE_HEIGHT,
  OG_CARD_IMAGE_WIDTH,
  OG_INK,
  OG_MUTE,
} from '@/lib/og/consts';

const BACK_CARD_WIDTH = 112;
const BACK_CARD_IMAGE_HEIGHT = 165;
const BACK_CARDS = [
  { left: 328, top: 42, rotate: -1 },
  { left: 372, top: 62, rotate: 6 },
];
const PLAY_ICON_SIZE = 22;
const CARD_STYLE = {
  display: 'flex',
  flexDirection: 'column' as const,
  position: 'absolute' as const,
  backgroundColor: '#ffffff',
  borderRadius: 6,
  overflow: 'hidden',
  boxShadow: '0 8px 18px rgba(30, 26, 18, 0.22)',
};

const PlayIcon = () => (
  <svg
    width={PLAY_ICON_SIZE}
    height={PLAY_ICON_SIZE}
    viewBox="0 0 24 24"
    style={{
      position: 'absolute',
      top: (OG_CARD_IMAGE_HEIGHT - PLAY_ICON_SIZE) / 2,
      left: (OG_CARD_IMAGE_WIDTH - PLAY_ICON_SIZE) / 2,
    }}
  >
    <path d="M7 4.5v15l12.5-7.5z" fill="#ffffff" fillOpacity="0.92" />
  </svg>
);

const CardMedia = ({
  card,
  width,
  height,
}: {
  card: OgMomentCard | null;
  width: number;
  height: number;
}) => {
  if (card?.image)
    return (
      // eslint-disable-next-line
      <img
        src={card.image}
        width={width}
        height={height}
        style={{ objectFit: 'cover' }}
      />
    );
  return (
    <div
      style={{
        display: card ? 'block' : 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width,
        height,
        padding: card ? 10 : 0,
        backgroundColor: card ? '#f4f1ec' : '#e0ddd8',
        fontFamily: 'Spectral',
        fontSize: card ? 9 : 12,
        lineHeight: 1.5,
        color: OG_MUTE,
        overflow: 'hidden',
      }}
    >
      {card ? (card.text ?? '') : 'No moments yet'}
    </div>
  );
};

const MomentCardStack = ({ cards }: { cards: OgMomentCard[] }) => {
  const [front, ...back] = cards;
  return (
    <>
      {back
        .slice(0, BACK_CARDS.length)
        .map((card, i) => ({ card, ...BACK_CARDS[i] }))
        .reverse()
        .map(({ card, left, top, rotate }) => (
          <div
            key={left}
            style={{
              ...CARD_STYLE,
              left,
              top,
              width: BACK_CARD_WIDTH,
              transform: `rotate(${rotate}deg)`,
            }}
          >
            <CardMedia
              card={card}
              width={BACK_CARD_WIDTH}
              height={BACK_CARD_IMAGE_HEIGHT}
            />
          </div>
        ))}
      <div
        style={{
          ...CARD_STYLE,
          left: 276,
          top: 36,
          width: OG_CARD_IMAGE_WIDTH,
          transform: 'rotate(-6deg)',
        }}
      >
        <div style={{ display: 'flex', position: 'relative' }}>
          <CardMedia
            card={front ?? null}
            width={OG_CARD_IMAGE_WIDTH}
            height={OG_CARD_IMAGE_HEIGHT}
          />
          {front?.isVideo && front.image && <PlayIcon />}
        </div>
        {front && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              paddingTop: 6,
              paddingRight: 8,
              paddingBottom: 7,
              paddingLeft: 8,
            }}
          >
            <div
              style={{
                display: 'block',
                fontFamily: 'Spectral',
                fontStyle: 'italic',
                fontSize: 12,
                lineHeight: 1.1,
                color: OG_INK,
                lineClamp: 1,
              }}
            >
              {front.name}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default MomentCardStack;
