import { z } from 'zod';
import { commentsSchema } from '../schema/commentsSchema';
import findMoments from '@/lib/moment/findMoments';
import getMomentCommentsRpc from '../supabase/in_process_moment_comments/getMomentCommentsRpc';
import { MomentCommentsResult } from '@/types/moment';

export type GetCommentsInput = z.infer<typeof commentsSchema>;

export async function momentComments({
  moment,
  offset,
  replyToId,
}: GetCommentsInput): Promise<MomentCommentsResult> {
  const { data: moments, error: momentsError } = await findMoments({
    moments: [moment],
  });

  if (momentsError) {
    throw new Error('Failed to get moments');
  }

  const momentData = moments?.[0];

  if (!momentData) {
    throw new Error('Moment not found');
  }

  const comments = await getMomentCommentsRpc({
    momentId: momentData.id,
    offset,
    replyToId,
  });

  return { comments };
}
