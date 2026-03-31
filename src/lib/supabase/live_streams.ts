import { createClient } from '@/lib/supabase/client';

export interface LiveStreamRow {
  id: string;
  user_id: string;
  username: string;
  avatar_url: string;
  title: string;
  is_live: boolean;
  viewer_count: number;
}

/**
 * Fetch visually active live streams natively bridging into the StoryBar component.
 * Filters exclusively for 'is_live' = true
 */
export async function fetchActiveLiveStreams(limit: number = 10): Promise<LiveStreamRow[]> {
  const supabase = createClient();

  try {
    const { data, error } = await supabase
      .from('live_streams')
      .select('id, user_id, username, avatar_url, title, is_live, viewer_count')
      .eq('is_live', true)
      .order('started_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Core Database Query Error fetching live streams:', error.message || error);
      return [];
    }

    return (data as LiveStreamRow[]) || [];
  } catch (err) {
    console.error('Fatal Catch fetching live streams:', err);
    return [];
  }
}
