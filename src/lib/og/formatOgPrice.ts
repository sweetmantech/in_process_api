import { formatUnits } from 'viem';
import { MomentType, type MomentSaleConfig } from '@/types/moment';

const formatOgPrice = (sale: MomentSaleConfig | null): string | null => {
  if (!sale) return null;
  const price = BigInt(sale.pricePerToken || '0');
  if (price === BigInt(0)) return 'FREE';
  const isUsdc = sale.type === MomentType.Erc20Mint;
  const amount = Number(formatUnits(price, isUsdc ? 6 : 18));
  const formatted = amount.toLocaleString('en-US', {
    maximumFractionDigits: isUsdc ? 2 : 4,
  });
  return `${formatted} ${isUsdc ? 'USDC' : 'ETH'}`;
};

export default formatOgPrice;
