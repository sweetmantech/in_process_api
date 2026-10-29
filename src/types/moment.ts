import { Address, Hash } from 'viem';

export interface Moment {
  collectionAddress: Address;
  tokenId: string;
  chainId: number;
}

export interface MomentCommentsResult {
  comments: MintComment[];
}

export interface MintComment {
  id: string;
  username: string;
  sender: string;
  comment: string;
  timestamp: number;
  commentId: string | null;
  replyToId: string | null;
  nonce: string | null;
  replyCount: number;
  replies: MintComment[];
}

export interface MomentMetadata {
  image: string;
  name: string;
  description: string;
  external_url?: string;
  content: {
    mime: string;
    uri: string;
  };
  animation_url?: string;
}

export enum MomentType {
  Erc20Mint = 'erc20Mint',
  TimedMint = 'timed',
  FixedPriceMint = 'fixedPrice',
}

export type MomentSaleConfig = {
  pricePerToken: string;
  saleStart: number;
  saleEnd: number;
  maxTokensPerAddress: number;
  fundsRecipient: Address;
  type: MomentType;
};

export interface TimelineMoment {
  address: string;
  token_id: string;
  chain_id: number;
  protocol: string;
  id: string;
  uri: string;
  creator: {
    address: string;
    username: string | null;
  };
  collection: {
    name: string;
  };
  admins: string[];
  hidden: string[];
  created_at: string;
  metadata: MomentMetadata | null;
  sale: MomentSaleConfig | null;
  comments: number;
}

export interface TimelinePagination {
  page: number;
  limit: number;
  total_pages: number;
}

export interface GetInProcessTimelineParams {
  limit?: number;
  page?: number;
  chainId?: number | null;
  hidden?: boolean;
  mime?: string;
  period?: string;
  channel?: string;
  curated?: boolean;
  protocol?: string;
  totalCount?: number;
}

export interface TimelineCountParams {
  chainId: number | null;
  hidden: boolean;
  mime?: string;
  period?: string;
  channel?: string;
  curated: boolean;
  protocol?: string;
}

export interface GetInProcessTimelineResponse {
  moments: TimelineMoment[];
  pagination: TimelinePagination;
}

export interface GetArtistTimelineParams {
  artist: string;
  type?: 'mutual' | 'default' | null;
  limit?: number;
  page?: number;
  chainId?: number | null;
  hidden?: boolean;
  mime?: string;
  period?: string;
  channel?: string;
  curated?: boolean;
  protocol?: string;
}

export interface GetArtistTimelineResponse {
  moments: TimelineMoment[];
  pagination: TimelinePagination;
}

export interface GetCollectionTimelineParams {
  collection: string;
  limit?: number;
  page?: number;
  chainId?: number | null;
  hidden?: boolean;
  mime?: string;
  period?: string;
  channel?: string;
  artist?: string;
  curated?: boolean;
  protocol?: string;
}

export interface GetCollectionTimelineResponse {
  moments: TimelineMoment[];
  pagination: TimelinePagination;
}

export type MomentResponse = {
  uri: string | null;
  contentUri: string | null;
  owner: string | null;
  saleConfig: MomentSaleConfig | null;
  momentAdmins: string[];
  metadata: MomentMetadata;
};

export type MomentAdvancedInfo = {
  id: string | null;
  uri: string | null;
  contentUri: string | null;
  owner: string | null;
  saleConfig: MomentSaleConfig | null;
  soldOut: boolean;
};

export interface UpdateMomentURIInput {
  moment: Moment;
  newUri: string;
  newCollectionAddress?: Address;
  artist: import('@/types/artist').ArtistContext;
}

export interface UpdateMomentURIResult {
  hash: Hash;
  chainId: number;
  contractAddress: Address;
  tokenId: string;
}

export interface UpdateCollectionCallInput {
  moment: Moment;
  contract: {
    uri: string;
    address: Address;
  };
  artistAddress: Address;
}

export interface MigrateMomentsApiInput {
  chainId?: number;
}

export interface MigrateMomentsResult {
  hash: Hash;
  chainId: number;
}

export interface MigrateMomentsApiResult {
  message: string;
  results: MigrateMomentsResult[];
}
