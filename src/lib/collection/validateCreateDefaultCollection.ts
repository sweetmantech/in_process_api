import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/authMiddleware';
import type { AuthResult } from '@/types/auth';

const validateCreateDefaultCollection = async (
  req: NextRequest
): Promise<AuthResult | NextResponse> => {
  const authResult = await authMiddleware(req);
  if (authResult instanceof Response) return authResult as NextResponse;
  return authResult;
};

export default validateCreateDefaultCollection;
