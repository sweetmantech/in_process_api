import { NextResponse } from 'next/server';
import { getArweaveDepositSmartAccount } from '@/lib/coinbase/getArweaveDepositSmartAccount';

const getArweaveDepositHandler = async () => {
  const smartAccount = await getArweaveDepositSmartAccount();
  return NextResponse.json({ address: smartAccount.address });
};

export default getArweaveDepositHandler;
