/**
 * Tags assets ingested for a moment so the Mux webhook can map them back.
 * Direct uploads use a random passthrough and are recorded by the migration.
 */
const buildMuxMomentPassthrough = (momentId: string) => `moment:${momentId}`;

export default buildMuxMomentPassthrough;
