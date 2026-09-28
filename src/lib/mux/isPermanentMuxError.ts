/**
 * True when Mux rejected this particular input (e.g. 400 invalid input URL),
 * so retrying the same moment won't help. Auth errors (401/403), rate limits
 * and server errors are account-wide or transient and must not mark moments.
 */
const isPermanentMuxError = (error: unknown): boolean => {
  const status = (error as { status?: unknown })?.status;
  return status === 400 || status === 422;
};

export default isPermanentMuxError;
