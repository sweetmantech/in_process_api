import getOgFont from './getOgFont';

const getArchivoFont = (): Promise<ArrayBuffer> =>
  getOgFont('Archivo-Regular.ttf');

export default getArchivoFont;
