import { IN_PROCESS_LOGO_URL, OG_INK, OG_LINE, OG_MUTE } from '@/lib/og/consts';

export interface ArtistOgStat {
  value: string;
  label: string;
}

const ArtistOgProfile = ({
  name,
  bio,
  stats,
}: {
  name: string;
  bio: string | null;
  stats: ArtistOgStat[];
}) => {
  const nameSize = name.length > 12 ? 34 : name.length > 7 ? 48 : 70;
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        position: 'absolute',
        left: 30,
        top: 28,
        bottom: 28,
        width: 230,
        color: OG_INK,
      }}
    >
      {/* eslint-disable-next-line */}
      <img src={IN_PROCESS_LOGO_URL} width={75} height={17} />
      <div
        style={{
          display: 'flex',
          marginTop: 26,
          fontFamily: 'Spectral',
          fontSize: nameSize,
          lineHeight: 0.9,
          letterSpacing: nameSize > 40 ? -1.5 : -0.8,
        }}
      >
        {name}
      </div>
      {bio && (
        <div
          style={{
            display: 'block',
            marginTop: 12,
            fontFamily: 'Spectral',
            fontSize: 12.5,
            lineHeight: 1.35,
            color: OG_MUTE,
            lineClamp: 3,
          }}
        >
          {bio}
        </div>
      )}
      <div
        style={{
          display: 'flex',
          marginTop: 'auto',
          paddingTop: 11,
          borderTop: `1px solid ${OG_LINE}`,
        }}
      >
        {stats.map((stat, i) => {
          const isLast = i === stats.length - 1;
          return (
            <div
              key={stat.label}
              style={{
                display: 'flex',
                flexDirection: 'column',
                paddingRight: isLast ? 0 : 13,
                marginRight: isLast ? 0 : 13,
                borderRight: isLast ? 'none' : `1px solid ${OG_LINE}`,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  fontFamily: 'Spectral',
                  fontSize: 19,
                  lineHeight: 1,
                }}
              >
                {stat.value}
              </div>
              <div
                style={{
                  display: 'flex',
                  marginTop: 5,
                  fontFamily: 'Archivo',
                  fontSize: 7.5,
                  letterSpacing: 1.4,
                  color: OG_MUTE,
                  textTransform: 'uppercase',
                }}
              >
                {stat.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ArtistOgProfile;
