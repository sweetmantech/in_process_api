// Upper bound keeps one cron run well inside maxDuration and Mux API limits.
const MAX_BATCH_SIZE = 50;

/**
 * Moments to ingest per cron run, from MUX_INGEST_BATCH_SIZE.
 * Unset or invalid means 0, so the cron does nothing until it's turned on.
 */
const getMuxIngestBatchSize = (): number => {
  const value = Number(process.env.MUX_INGEST_BATCH_SIZE);
  if (!Number.isInteger(value) || value <= 0) return 0;
  return Math.min(value, MAX_BATCH_SIZE);
};

export default getMuxIngestBatchSize;
