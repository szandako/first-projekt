import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase/client';
import {
  uploadPostImage,
  getImageUrl,
  deletePostImage,
  compressImage,
} from '../lib/supabase/storage';

export interface PostImage {
  id: string;
  post_id: string;
  storage_path: string;
  position: number;
  file_size: number | null;
  width: number | null;
  height: number | null;
  created_at: string;
  // Client-side only
  url?: string;
}

export const usePostImages = (postId: string | undefined) => {
  const [images, setImages] = useState<PostImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!postId) {
      setImages([]);
      setLoading(false);
      return;
    }

    const fetchImages = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('post_images')
          .select('*')
          .eq('post_id', postId)
          .order('position', { ascending: true });

        if (error) throw error;

        // Fetch signed URLs for all images
        const imagesWithUrls = await Promise.all(
          (data || []).map(async (img) => {
            try {
              const url = await getImageUrl(img.storage_path);
              return { ...img, url };
            } catch (err) {
              console.error('Error fetching image URL:', err);
              return img;
            }
          })
        );

        setImages(imagesWithUrls);
      } catch (err: any) {
        console.error('Error fetching post images:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchImages();
  }, [postId]);

  const addImage = async (
    file: File,
    userId: string,
    feedId: string,
    position: number
  ) => {
    if (!postId) throw new Error('Post ID is required');

    try {
      // Compress image first
      const compressedFile = await compressImage(file);

      // Generate unique ID for the image
      const imageId = crypto.randomUUID();

      // Upload to storage
      const storagePath = await uploadPostImage(
        compressedFile,
        userId,
        feedId,
        postId,
        imageId
      );

      // Get image dimensions
      const dimensions = await getImageDimensions(file);

      // Insert into database
      const { data, error } = await supabase
        .from('post_images')
        .insert({
          id: imageId,
          post_id: postId,
          storage_path: storagePath,
          position,
          file_size: compressedFile.size,
          width: dimensions.width,
          height: dimensions.height,
        })
        .select()
        .single();

      if (error) throw error;

      // Get signed URL
      const url = await getImageUrl(storagePath);
      const imageWithUrl = { ...data, url };

      setImages((prev) =>
        [...prev, imageWithUrl].sort((a, b) => a.position - b.position)
      );

      return imageWithUrl;
    } catch (err: any) {
      console.error('Error adding image:', err);
      throw err;
    }
  };

  const removeImage = async (imageId: string, storagePath: string) => {
    try {
      // Delete from storage
      await deletePostImage(storagePath);

      // Delete from database
      const { error } = await supabase
        .from('post_images')
        .delete()
        .eq('id', imageId);

      if (error) throw error;

      setImages((prev) => prev.filter((img) => img.id !== imageId));
    } catch (err: any) {
      console.error('Error removing image:', err);
      throw err;
    }
  };

  const reorderImages = async (reorderedImages: PostImage[]) => {
    try {
      // Update positions in database
      const updates = reorderedImages.map((img, index) => ({
        id: img.id,
        position: index,
      }));

      for (const update of updates) {
        await supabase
          .from('post_images')
          .update({ position: update.position })
          .eq('id', update.id);
      }

      setImages(reorderedImages);
    } catch (err: any) {
      console.error('Error reordering images:', err);
      throw err;
    }
  };

  return {
    images,
    loading,
    error,
    addImage,
    removeImage,
    reorderImages,
  };
};

// Helper function to get image dimensions
const getImageDimensions = (
  file: File
): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.width, height: img.height });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
};
