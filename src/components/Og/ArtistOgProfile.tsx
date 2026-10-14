import { IN_PROCESS_LOGO_URL } from '@/lib/og/consts';

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
  const nameSize = name.length > 14 ? 30 : name.length > 9 ? 40 : 52;
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: 228,
        height: '100%',
      }}
    >
      {/* eslint-disable-next-line */}
      <img src={IN_PROCESS_LOGO_URL} width={66} height={15} />
      <div
        style={{
          display: 'flex',
          marginTop: 22,
          fontFamily: 'Spectral',
          fontSize: nameSize,
          lineHeight: 1,
          color: '#1c1a17',
        }}
      >
        {name}
      </div>
      {bio && (
        <div
          style={{
            display: 'block',
            marginTop: 14,
            fontFamily: 'Spectral',
            fontSize: 11,
            lineHeight: 1.45,
            color: '#4a4741',
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
          paddingTop: 12,
          borderTop: '1px solid #cfcac2',
        }}
      >
        {stats.map((stat, i) => (
          <div
            key={stat.label}
            style={{
              display: 'flex',
              flexDirection: 'column',
              paddingLeft: i === 0 ? 0 : 12,
              paddingRight: 12,
              borderLeft: i === 0 ? 'none' : '1px solid #cfcac2',
            }}
          >
            <div
              style={{
                display: 'flex',
                fontFamily: 'Spectral',
                fontSize: 16,
                color: '#1c1a17',
              }}
            >
              {stat.value}
            </div>
            <div
              style={{
                display: 'flex',
                marginTop: 4,
                fontFamily: 'Archivo',
                fontSize: 6,
                letterSpacing: 1.2,
                color: '#8a857c',
                textTransform: 'uppercase',
              }}
            >
              {stat.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ArtistOgProfile;
