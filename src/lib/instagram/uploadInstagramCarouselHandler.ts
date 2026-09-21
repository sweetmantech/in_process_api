import { NextResponse } from 'next/server';
import uploadInstagramCarousel from './uploadInstagramCarousel';

const uploadInstagramCarouselHandler = async (url: string) => {
  const result = await uploadInstagramCarousel(url);
  if (!result) {
    return NextResponse.json(
      { message: 'url is not a carousel (Sidecar) Instagram post' },
      { status: 400 }
    );
  }

  return NextResponse.json(result);
};

export default uploadInstagramCarouselHandler;
