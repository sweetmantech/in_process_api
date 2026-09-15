// Shared by InProcessERC20Minter and InProcessCreatorFixedPriceSaleStrategy —
// matched by topic hash, so which contract actually emitted it doesn't matter.
const mintCommentAbi = [
  {
    type: 'event',
    anonymous: false,
    name: 'MintComment',
    inputs: [
      { name: 'sender', type: 'address', indexed: true },
      { name: 'tokenContract', type: 'address', indexed: true },
      { name: 'tokenId', type: 'uint256', indexed: true },
      { name: 'quantity', type: 'uint256', indexed: false },
      { name: 'comment', type: 'string', indexed: false },
    ],
  },
] as const;

export default mintCommentAbi;
