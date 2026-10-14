import { SITE_ORIGINAL_URL } from '@/lib/consts';

const getOgFont = async (fileName: string): Promise<ArrayBuffer> => {
  const res = await fetch(`${SITE_ORIGINAL_URL}/fonts/${fileName}`);
  if (!res.ok) throw Error(`failed to fetch ${fileName}: ${res.status}`);
  return res.arrayBuffer();
};

export default getOgFont;
