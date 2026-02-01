import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase/client';

// Supabase free tier: 1GB storage
const STORAGE_LIMIT_BYTES = 1 * 1024 * 1024 * 1024; // 1GB
const WARNING_THRESHOLD = 0.8; // 80%

export interface StorageUsage {
  usedBytes: number;
  limitBytes: number;
  usedPercentage: number;
  isNearLimit: boolean;
  formattedUsed: string;
  formattedLimit: string;
}

/**
 * Hook to track user's storage usage in Supabase
 * Sums up file_size from all post_images for user's owned feeds
 */
export const useStorageUsage = (userId: string | undefined) => {
  const [usage, setUsage] = useState<StorageUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const fetchUsage = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Get all feeds owned by the user
      const { data: feeds, error: feedsError } = await supabase
        .from('feeds')
        .select('id')
        .eq('owner_id', userId);

      if (feedsError) throw feedsError;

      if (!feeds || feeds.length === 0) {
        setUsage({
          usedBytes: 0,
          limitBytes: STORAGE_LIMIT_BYTES,
          usedPercentage: 0,
          isNearLimit: false,
          formattedUsed: '0 B',
          formattedLimit: formatBytes(STORAGE_LIMIT_BYTES),
        });
        setLoading(false);
        return;
      }

      const feedIds = feeds.map((f) => f.id);

      // Get all posts for those feeds
      const { data: posts, error: postsError } = await supabase
        .from('posts')
        .select('id')
        .in('feed_id', feedIds);

      if (postsError) throw postsError;

      if (!posts || posts.length === 0) {
        setUsage({
          usedBytes: 0,
          limitBytes: STORAGE_LIMIT_BYTES,
          usedPercentage: 0,
          isNearLimit: false,
          formattedUsed: '0 B',
          formattedLimit: formatBytes(STORAGE_LIMIT_BYTES),
        });
        setLoading(false);
        return;
      }

      const postIds = posts.map((p) => p.id);

      // Sum all file sizes for those posts
      const { data: images, error: imagesError } = await supabase
        .from('post_images')
        .select('file_size')
        .in('post_id', postIds);

      if (imagesError) throw imagesError;

      const totalBytes = (images || []).reduce(
        (sum, img) => sum + (img.file_size || 0),
        0
      );

      const percentage = (totalBytes / STORAGE_LIMIT_BYTES) * 100;

      setUsage({
        usedBytes: totalBytes,
        limitBytes: STORAGE_LIMIT_BYTES,
        usedPercentage: percentage,
        isNearLimit: percentage >= WARNING_THRESHOLD * 100,
        formattedUsed: formatBytes(totalBytes),
        formattedLimit: formatBytes(STORAGE_LIMIT_BYTES),
      });
    } catch (err: any) {
      console.error('Error fetching storage usage:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

  return {
    usage,
    loading,
    error,
    refetch: fetchUsage,
  };
};
