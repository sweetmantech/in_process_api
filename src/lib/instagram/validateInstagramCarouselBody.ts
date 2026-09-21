import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/authMiddleware';
import { validate } from '@/lib/schema/validate';
import instagramCarouselBodySchema from '@/lib/schema/instagramCarouselBodySchema';
import { validateUrl } from '@/lib/url/validateUrl';

const validateInstagramCarouselBody = async (req: NextRequest) => {
  const authResult = await authMiddleware(req);
  if (authResult instanceof Response) return authResult as NextResponse;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = validate(instagramCarouselBodySchema, body);
  if (!parsed.success) return parsed.response;

  const validatedUrl = validateUrl(parsed.data.url);
  if (!validatedUrl || !validatedUrl.includes('instagram.com')) {
    return NextResponse.json(
      { message: 'url must be a valid instagram.com post URL' },
      { status: 400 }
    );
  }

  return { url: validatedUrl };
};

export default validateInstagramCarouselBody;
