import { erc20Abi } from 'viem';
import { getPublicClient } from '@/lib/viem/publicClient';
import { CHAIN_ID, USDC_ADDRESS } from '@/lib/consts';
import { getArweaveDepositSmartAccount } from '@/lib/coinbase/getArweaveDepositSmartAccount';
import topUpTurboCreditsFromAccount from './topUpTurboCreditsFromAccount';

const MIN_FORWARD_USDC_MICROS = BigInt(1_000_000);

const forwardArweaveDeposit = async () => {
  const smartAccount = await getArweaveDepositSmartAccount();
  const balance = await getPublicClient(CHAIN_ID).readContract({
    address: USDC_ADDRESS[CHAIN_ID],
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [smartAccount.address],
  });

  if (balance < MIN_FORWARD_USDC_MICROS) {
    return { address: smartAccount.address, forwardedUsdcMicros: '0' };
  }

  const result = await topUpTurboCreditsFromAccount(smartAccount, balance);
  return {
    address: smartAccount.address,
    forwardedUsdcMicros: balance.toString(),
    result,
  };
};

export default forwardArweaveDeposit;
