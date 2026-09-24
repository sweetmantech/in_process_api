/**
 * Returns a stream of bytes `start`..`end` (inclusive) from a full-resource body,
 * for origins that ignore `Range` and answer 200. Cancels the upstream once done.
 */
const sliceByteRange = (
  body: ReadableStream<Uint8Array>,
  start: number,
  end: number
): ReadableStream<Uint8Array> => {
  const reader = body.getReader();
  let offset = 0;

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          controller.close();
          return;
        }
        const chunkStart = offset;
        offset += value.length;
        if (offset <= start) continue;

        const from = Math.max(start - chunkStart, 0);
        const to = Math.min(end + 1 - chunkStart, value.length);
        controller.enqueue(value.subarray(from, to));

        if (offset > end) {
          controller.close();
          await reader.cancel();
        }
        return;
      }
    },
    cancel(reason) {
      return reader.cancel(reason);
    },
  });
};

export default sliceByteRange;
