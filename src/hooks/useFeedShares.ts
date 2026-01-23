import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase/client';

export interface FeedShare {
  id: string;
  feed_id: string;
  shared_with_user_id: string;
  shared_by_user_id: string;
  permission: string;
  created_at: string;
  // Client-side only (joined from profiles)
  shared_with_email?: string;
  shared_with_full_name?: string;
}

export const useFeedShares = (feedId: string | undefined) => {
  const [shares, setShares] = useState<FeedShare[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!feedId) {
      setShares([]);
      setLoading(false);
      return;
    }

    const fetchShares = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('feed_shares')
          .select(`
            *,
            profiles!feed_shares_shared_with_user_id_fkey (
              email,
              full_name
            )
          `)
          .eq('feed_id', feedId)
          .order('created_at', { ascending: false });

        if (error) throw error;

        // Map the joined data
        const sharesWithUsers = (data || []).map((share: any) => ({
          id: share.id,
          feed_id: share.feed_id,
          shared_with_user_id: share.shared_with_user_id,
          shared_by_user_id: share.shared_by_user_id,
          permission: share.permission,
          created_at: share.created_at,
          shared_with_email: share.profiles?.email,
          shared_with_full_name: share.profiles?.full_name,
        }));

        setShares(sharesWithUsers);
      } catch (err: any) {
        console.error('Error fetching feed shares:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchShares();
  }, [feedId]);

  const shareFeed = async (email: string) => {
    if (!feedId) throw new Error('Feed ID is required');

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Find user by email
      const { data: targetUser, error: userError } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .eq('email', email.toLowerCase().trim())
        .single();

      if (userError || !targetUser) {
        throw new Error('Nem található felhasználó ezzel az email címmel');
      }

      // Check if user is trying to share with themselves
      if (targetUser.id === user.id) {
        throw new Error('Nem oszthatod meg saját magaddal a feedet');
      }

      // Check if already shared
      const { data: existing } = await supabase
        .from('feed_shares')
        .select('id')
        .eq('feed_id', feedId)
        .eq('shared_with_user_id', targetUser.id)
        .single();

      if (existing) {
        throw new Error('Ez a feed már meg van osztva ezzel a felhasználóval');
      }

      // Create share
      const { data, error } = await supabase
        .from('feed_shares')
        .insert({
          feed_id: feedId,
          shared_with_user_id: targetUser.id,
          shared_by_user_id: user.id,
          permission: 'viewer',
        })
        .select()
        .single();

      if (error) throw error;

      // Add to local state
      const newShare: FeedShare = {
        id: data.id,
        feed_id: data.feed_id,
        shared_with_user_id: data.shared_with_user_id,
        shared_by_user_id: data.shared_by_user_id,
        permission: data.permission,
        created_at: data.created_at,
        shared_with_email: targetUser.email,
        shared_with_full_name: targetUser.full_name,
      };

      setShares((prev) => [newShare, ...prev]);
      return newShare;
    } catch (err: any) {
      console.error('Error sharing feed:', err);
      throw err;
    }
  };

  const removeShare = async (shareId: string) => {
    try {
      const { error } = await supabase
        .from('feed_shares')
        .delete()
        .eq('id', shareId);

      if (error) throw error;

      setShares((prev) => prev.filter((share) => share.id !== shareId));
    } catch (err: any) {
      console.error('Error removing share:', err);
      throw err;
    }
  };

  return {
    shares,
    loading,
    error,
    shareFeed,
    removeShare,
  };
};
