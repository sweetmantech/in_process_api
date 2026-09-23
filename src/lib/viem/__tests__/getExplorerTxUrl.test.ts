import { describe, it, expect } from 'vitest';
import getExplorerTxUrl from '../getExplorerTxUrl';

describe('getExplorerTxUrl', () => {
  it('links to basescan for Base mainnet', () => {
    expect(getExplorerTxUrl(8453, '0xabc')).toBe(
      'https://basescan.org/tx/0xabc'
    );
  });

  it('links to sepolia basescan for Base Sepolia', () => {
    expect(getExplorerTxUrl(84532, '0xabc')).toBe(
      'https://sepolia.basescan.org/tx/0xabc'
    );
  });

  it('defaults to mainnet basescan for unrecognized chains', () => {
    expect(getExplorerTxUrl(1, '0xabc')).toBe('https://basescan.org/tx/0xabc');
  });
});
