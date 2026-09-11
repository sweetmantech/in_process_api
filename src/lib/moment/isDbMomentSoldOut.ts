/** Sold out when max supply is set and fully minted (DB denormalized counters). */
const isDbMomentSoldOut = ({
  max_supply,
  total_minted,
}: {
  max_supply: number;
  total_minted: number;
}): boolean => max_supply > 0 && total_minted >= max_supply;

export default isDbMomentSoldOut;
