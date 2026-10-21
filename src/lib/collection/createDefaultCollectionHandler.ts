import { NextResponse } from 'next/server';
import type { AuthResult } from '@/types/auth';
import { CHAIN_ID } from '@/lib/consts';
import resolveDefaultCollection from '@/lib/collection/resolveDefaultCollection';

const createDefaultCollectionHandler = async (
  artist: AuthResult
): Promise<NextResponse> => {
  const collection = await resolveDefaultCollection(artist, CHAIN_ID);
  return NextResponse.json(collection);
};

export default createDefaultCollectionHandler;
