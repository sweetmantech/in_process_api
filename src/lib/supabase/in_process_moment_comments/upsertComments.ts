import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/types';

type CommentInsert =
  Database['public']['Tables']['in_process_moment_comments']['Insert'];

export async function upsertComments(
  comments: Array<CommentInsert>,
  onConflict: 'moment,transaction_hash,log_index' | 'comment_id'
): Promise<void> {
  if (!comments.length) return;
  const { error } = await supabase
    .from('in_process_moment_comments')
    .upsert(comments, { onConflict });
  if (error) throw error;
}
