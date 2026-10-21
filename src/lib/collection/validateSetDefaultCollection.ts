import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/authMiddleware';
import { setDefaultCollectionSchema } from '@/lib/schema/setDefaultCollectionSchema';
import { validate } from '@/lib/schema/validate';

const validateSetDefaultCollection = async (req: NextRequest) => {
  const authResult = await authMiddleware(req);
  if (authResult instanceof Response) return authResult as NextResponse;

  const body = await req.json().catch(() => null);
  const result = validate(setDefaultCollectionSchema, body);
  if (!result.success) return result.response;

  return {
    artist: authResult,
    collectionAddress: result.data.collectionAddress,
  };
};

export default validateSetDefaultCollection;
