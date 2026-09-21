import { APIFY_INSTAGRAM_ACTOR } from '@/lib/consts';

export interface ApifyInstagramChildPost {
  type?: string;
  displayUrl?: string;
  videoUrl?: string;
}

export interface ApifyInstagramItem {
  type?: string;
  url?: string;
  displayUrl?: string;
  videoUrl?: string;
  childPosts?: ApifyInstagramChildPost[];
  caption?: string;
  ownerUsername?: string;
  error?: string;
}

const fetchInstagramPost = async (
  postUrl: string
): Promise<ApifyInstagramItem | null> => {
  const token = process.env.APIFY_TOKEN;
  if (!token) return null;

  const response = await fetch(
    `https://api.apify.com/v2/acts/${APIFY_INSTAGRAM_ACTOR}/run-sync-get-dataset-items?token=${token}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // `username` is this actor's input field for direct post URLs too.
      // `childPosts` (needed for carousels) only comes back at the actor's
      // default dataDetailLevel ("detailedData") — don't downgrade it.
      body: JSON.stringify({ username: [postUrl] }),
    }
  );
  if (!response.ok) return null;

  const items: ApifyInstagramItem[] = await response.json();
  const item = items?.[0];
  if (!item || item.error) return null;

  return item;
};

export default fetchInstagramPost;
