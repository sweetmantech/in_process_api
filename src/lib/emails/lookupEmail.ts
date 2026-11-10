import { NextResponse } from 'next/server';
import lookupArtistEmail from '@/lib/emails/lookupArtistEmail';

const lookupEmail = async (artistAddress: string) => {
  const email = await lookupArtistEmail(artistAddress);
  return NextResponse.json({ email });
};

export default lookupEmail;
