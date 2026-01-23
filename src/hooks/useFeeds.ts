import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase/client';

interface Feed {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export const useFeeds = (userId: string | undefined) => {
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setFeeds([]);
      setLoading(false);
      return;
    }

    const fetchFeeds = async () => {
      try {
        setLoading(true);
        // Fetch both owned and shared feeds (RLS handles permissions)
        const { data, error } = await supabase
          .from('feeds')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setFeeds(data || []);
      } catch (err: any) {
        console.error('Error fetching feeds:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchFeeds();
  }, [userId]);

  const createFeed = async (name: string, description?: string) => {
    try {
      const { data, error } = await supabase
        .from('feeds')
        .insert({ name, description, owner_id: userId! })
        .select()
        .single();

      if (error) throw error;
      setFeeds((prev) => [data, ...prev]);
      return data;
    } catch (err: any) {
      console.error('Error creating feed:', err);
      throw err;
    }
  };

  const updateFeed = async (
    id: string,
    updates: { name?: string; description?: string }
  ) => {
    try {
      const { data, error } = await supabase
        .from('feeds')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      setFeeds((prev) => prev.map((f) => (f.id === id ? data : f)));
      return data;
    } catch (err: any) {
      console.error('Error updating feed:', err);
      throw err;
    }
  };

  const deleteFeed = async (id: string) => {
    try {
      const { error } = await supabase.from('feeds').delete().eq('id', id);

      if (error) throw error;
      setFeeds((prev) => prev.filter((f) => f.id !== id));
    } catch (err: any) {
      console.error('Error deleting feed:', err);
      throw err;
    }
  };

  return {
    feeds,
    loading,
    error,
    createFeed,
    updateFeed,
    deleteFeed,
  };
};
