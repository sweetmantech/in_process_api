import { NextRequest } from 'next/server';
import validateInstagramCarouselBody from '@/lib/instagram/validateInstagramCarouselBody';
import uploadInstagramCarouselHandler from '@/lib/instagram/uploadInstagramCarouselHandler';

export async function POST(req: NextRequest) {
  try {
    const validated = await validateInstagramCarouselBody(req);
    if (validated instanceof Response) return validated;
    return uploadInstagramCarouselHandler(validated.url);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed';
    return Response.json({ message }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;
