import type {
  TurboCryptoFundResponse,
  TurboSubmitFundTxResponse,
} from '@ardrive/turbo-sdk/node';
import topUpTurboCreditsFromAccount from './topUpTurboCreditsFromAccount';
import { getArtistSmartAccount } from '../coinbase/getArtistSmartAccount';

const topUpTurboCredits = async (
  artistId: string,
  usdcAmountMicros: bigint
): Promise<TurboCryptoFundResponse | TurboSubmitFundTxResponse> => {
  try {
    const smartAccount = await getArtistSmartAccount({ artistId });
    return await topUpTurboCreditsFromAccount(smartAccount, usdcAmountMicros);
  } catch (error) {
    console.error(`❌ topUpTurboCredits: ${error}`);
    throw new Error(`❌ topUpTurboCredits: ${error}`);
  }
};

export default topUpTurboCredits;
