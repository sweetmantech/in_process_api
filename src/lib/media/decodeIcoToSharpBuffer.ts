const decodeIcoToSharpBuffer = (buffer: Buffer): Buffer => {
  const imageCount = buffer.readUInt16LE(4);
  if (imageCount === 0) throw new Error('ICO contains no images');

  let best: { area: number; offset: number; bytesInRes: number } | undefined;

  for (let index = 0; index < imageCount; index += 1) {
    const entryOffset = 6 + index * 16;
    if (entryOffset + 16 > buffer.length) break;

    const width = buffer.readUInt8(entryOffset) || 256;
    const height = buffer.readUInt8(entryOffset + 1) || 256;
    const bytesInRes = buffer.readUInt32LE(entryOffset + 8);
    const imageOffset = buffer.readUInt32LE(entryOffset + 12);
    const area = width * height;

    if (
      bytesInRes <= 0 ||
      imageOffset < 0 ||
      imageOffset + bytesInRes > buffer.length
    ) {
      continue;
    }

    if (!best || area > best.area) {
      best = { area, offset: imageOffset, bytesInRes };
    }
  }

  if (!best) throw new Error('ICO contains no readable images');

  return buffer.subarray(best.offset, best.offset + best.bytesInRes);
};

export default decodeIcoToSharpBuffer;
