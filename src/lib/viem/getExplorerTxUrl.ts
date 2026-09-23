import { baseSepolia } from 'viem/chains';

const getExplorerTxUrl = (chainId: number, transactionHash: string) => {
  const explorerBase =
    chainId === baseSepolia.id
      ? 'https://sepolia.basescan.org'
      : 'https://basescan.org';
  return `${explorerBase}/tx/${transactionHash}`;
};

export default getExplorerTxUrl;
