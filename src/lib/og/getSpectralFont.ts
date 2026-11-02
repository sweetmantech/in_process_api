import getOgFont from './getOgFont';

const getSpectralFont = (): Promise<ArrayBuffer> =>
  getOgFont('Spectral-Regular.ttf');

export default getSpectralFont;
