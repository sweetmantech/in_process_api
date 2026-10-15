import { TurboFactory } from '@ardrive/turbo-sdk/node';
import type {
  TurboCryptoFundResponse,
  TurboSubmitFundTxResponse,
} from '@ardrive/turbo-sdk/node';
import type { EvmSmartAccount } from '@coinbase/cdp-sdk';
import turboClient from './turboClient';
import createTurboWalletAdapter from './createTurboWalletAdapter';

const topUpTurboCreditsFromAccount = async (
  smartAccount: EvmSmartAccount,
  usdcAmountMicros: bigint
): Promise<TurboCryptoFundResponse | TurboSubmitFundTxResponse> => {
  const ourArweaveAddress = await turboClient.signer.getNativeAddress();

  const payerTurbo = TurboFactory.authenticated({
    walletAdapter: createTurboWalletAdapter(smartAccount),
    token: 'base-usdc',
  });

  try {
    return await payerTurbo.topUpWithTokens({
      tokenAmount: usdcAmountMicros.toString(),
      turboCreditDestinationAddress: ourArweaveAddress,
    });
  } catch (fundError: unknown) {
    const message =
      fundError instanceof Error ? fundError.message : String(fundError);
    const txIdMatch = message.match(
      /submitFundTransaction\(id\)':\s*(0x[0-9a-fA-F]+)/
    );
    if (txIdMatch) {
      const txId = txIdMatch[1];
      console.warn(
        `⚠️ topUpWithTokens Phase 2 failed, retrying submitFundTransaction for ${txId}`
      );
      return await payerTurbo.submitFundTransaction({ txId });
    }
    throw fundError;
  }
};

export default topUpTurboCreditsFromAccount;
