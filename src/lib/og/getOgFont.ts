import { readFile } from 'fs/promises';
import path from 'path';

const getOgFont = async (fileName: string): Promise<ArrayBuffer> => {
  const buffer = await readFile(
    path.join(process.cwd(), 'assets', 'fonts', fileName)
  );
  return buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength
  ) as ArrayBuffer;
};

export default getOgFont;
