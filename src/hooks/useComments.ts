import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  // Client-side only (joined from profiles)
  user_email?: string;
  user_full_name?: string;
}

export const useComments = (postId: string | undefined) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!postId) {
      setComments([]);
      setLoading(false);
      return;
    }

    let channel: RealtimeChannel | null = null;

    const fetchComments = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('comments')
          .select(`
            *,
            profiles!comments_user_id_fkey (
              email,
              full_name
            )
          `)
          .eq('post_id', postId)
          .order('created_at', { ascending: true });

        if (error) throw error;

        // Map the joined data
        const commentsWithUsers = (data || []).map((comment: any) => ({
          id: comment.id,
          post_id: comment.post_id,
          user_id: comment.user_id,
          content: comment.content,
          created_at: comment.created_at,
          updated_at: comment.updated_at,
          user_email: comment.profiles?.email,
          user_full_name: comment.profiles?.full_name,
        }));

        setComments(commentsWithUsers);
      } catch (err: any) {
        console.error('Error fetching comments:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchComments();

    // Real-time subscription
    channel = supabase
      .channel(`comments:post_id=eq.${postId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'comments',
          filter: `post_id=eq.${postId}`,
        },
        async (payload) => {
          console.log('New comment:', payload);

          // Fetch user info for the new comment
          const { data: profile } = await supabase
            .from('profiles')
            .select('email, full_name')
            .eq('id', payload.new.user_id)
            .single();

          const newComment: Comment = {
            id: payload.new.id,
            post_id: payload.new.post_id,
            user_id: payload.new.user_id,
            content: payload.new.content,
            created_at: payload.new.created_at,
            updated_at: payload.new.updated_at,
            user_email: profile?.email,
            user_full_name: profile?.full_name,
          };

          setComments((prev) => [...prev, newComment]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'comments',
          filter: `post_id=eq.${postId}`,
        },
        (payload) => {
          console.log('Comment updated:', payload);
          setComments((prev) =>
            prev.map((comment) =>
              comment.id === payload.new.id
                ? { ...comment, content: payload.new.content, updated_at: payload.new.updated_at }
                : comment
            )
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'comments',
          filter: `post_id=eq.${postId}`,
        },
        (payload) => {
          console.log('Comment deleted:', payload);
          setComments((prev) => prev.filter((comment) => comment.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [postId]);

  const addComment = async (content: string) => {
    if (!postId) throw new Error('Post ID is required');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('comments')
        .insert({
          post_id: postId,
          user_id: user.id,
          content: content.trim(),
        })
        .select()
        .single();

      if (error) throw error;

      // Real-time will handle adding to the list
      return data;
    } catch (err: any) {
      console.error('Error adding comment:', err);
      throw err;
    }
  };

  const updateComment = async (commentId: string, content: string) => {
    try {
      const { error } = await supabase
        .from('comments')
        .update({
          content: content.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', commentId);

      if (error) throw error;

      // Real-time will handle updating the list
    } catch (err: any) {
      console.error('Error updating comment:', err);
      throw err;
    }
  };

  const deleteComment = async (commentId: string) => {
    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;

      // Real-time will handle removing from the list
    } catch (err: any) {
      console.error('Error deleting comment:', err);
      throw err;
    }
  };

  return {
    comments,
    loading,
    error,
    addComment,
    updateComment,
    deleteComment,
  };
};
