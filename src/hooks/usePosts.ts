import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase/client';

export interface Post {
  id: string;
  feed_id: string;
  caption: string | null;
  scheduled_time: string | null;
  position: number;
  created_at: string;
  updated_at: string;
}

export const usePosts = (feedId: string | undefined) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!feedId) {
      setPosts([]);
      setLoading(false);
      return;
    }

    const fetchPosts = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('posts')
          .select('*')
          .eq('feed_id', feedId)
          .order('position', { ascending: true });

        if (error) throw error;
        setPosts(data || []);
      } catch (err: any) {
        console.error('Error fetching posts:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, [feedId]);

  const createPost = async (
    position: number,
    caption?: string,
    scheduledTime?: Date
  ) => {
    if (!feedId) throw new Error('Feed ID is required');

    try {
      const { data, error } = await supabase
        .from('posts')
        .insert({
          feed_id: feedId,
          position,
          caption: caption || null,
          scheduled_time: scheduledTime?.toISOString() || null,
        })
        .select()
        .single();

      if (error) throw error;
      setPosts((prev) => [...prev, data].sort((a, b) => a.position - b.position));
      return data;
    } catch (err: any) {
      console.error('Error creating post:', err);
      throw err;
    }
  };

  const updatePost = async (
    id: string,
    updates: {
      caption?: string;
      scheduled_time?: Date | null;
      position?: number;
    }
  ) => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .update({
          ...updates,
          scheduled_time: updates.scheduled_time
            ? updates.scheduled_time.toISOString()
            : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      setPosts((prev) =>
        prev.map((p) => (p.id === id ? data : p)).sort((a, b) => a.position - b.position)
      );
      return data;
    } catch (err: any) {
      console.error('Error updating post:', err);
      throw err;
    }
  };

  const deletePost = async (id: string) => {
    try {
      const { error } = await supabase.from('posts').delete().eq('id', id);

      if (error) throw error;
      setPosts((prev) => prev.filter((p) => p.id !== id));
    } catch (err: any) {
      console.error('Error deleting post:', err);
      throw err;
    }
  };

  const reorderPosts = async (reorderedPosts: Post[]) => {
    try {
      // Step 1: Offset all positions to avoid UNIQUE(feed_id, position) constraint conflicts
      const offset = 10000;
      for (let i = 0; i < reorderedPosts.length; i++) {
        const { error } = await supabase
          .from('posts')
          .update({ position: i + offset })
          .eq('id', reorderedPosts[i].id);

        if (error) {
          console.error(`Error offsetting post ${reorderedPosts[i].id}:`, error);
          throw error;
        }
      }

      // Step 2: Set final positions
      for (let i = 0; i < reorderedPosts.length; i++) {
        const { error } = await supabase
          .from('posts')
          .update({ position: reorderedPosts[i].position, updated_at: new Date().toISOString() })
          .eq('id', reorderedPosts[i].id);

        if (error) {
          console.error(`Error setting final position for post ${reorderedPosts[i].id}:`, error);
          throw error;
        }
      }

      // Update local state
      setPosts(reorderedPosts);
    } catch (err: any) {
      console.error('Error reordering posts:', err);
      throw err;
    }
  };

  return {
    posts,
    loading,
    error,
    createPost,
    updatePost,
    deletePost,
    reorderPosts,
  };
};
