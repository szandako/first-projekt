import { supabase } from './client';

/**
 * Upload an image to Supabase Storage
 * @param file - The file to upload
 * @param userId - The user ID
 * @param feedId - The feed ID
 * @param postId - The post ID
 * @param imageId - The image ID (UUID)
 * @returns The storage path
 */
export const uploadPostImage = async (
  file: File,
  userId: string,
  feedId: string,
  postId: string,
  imageId: string
): Promise<string> => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${imageId}.${fileExt}`;
  const filePath = `${userId}/${feedId}/${postId}/${fileName}`;

  const { error } = await supabase.storage
    .from('post-images')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) throw error;

  return filePath;
};

/**
 * Get a signed URL for an image
 * @param path - The storage path
 * @param expiresIn - Expiration time in seconds (default: 1 hour)
 * @returns The signed URL
 */
export const getImageUrl = async (
  path: string,
  expiresIn: number = 3600
): Promise<string> => {
  const { data, error } = await supabase.storage
    .from('post-images')
    .createSignedUrl(path, expiresIn);

  if (error) throw error;
  if (!data?.signedUrl) throw new Error('Failed to generate signed URL');

  return data.signedUrl;
};

/**
 * Delete an image from storage
 * @param path - The storage path
 */
export const deletePostImage = async (path: string): Promise<void> => {
  const { error } = await supabase.storage.from('post-images').remove([path]);

  if (error) throw error;
};

/**
 * Delete all images for a post
 * @param userId - The user ID
 * @param feedId - The feed ID
 * @param postId - The post ID
 */
export const deletePostImages = async (
  userId: string,
  feedId: string,
  postId: string
): Promise<void> => {
  const folderPath = `${userId}/${feedId}/${postId}`;

  const { data: files, error: listError } = await supabase.storage
    .from('post-images')
    .list(folderPath);

  if (listError) throw listError;

  if (files && files.length > 0) {
    const filePaths = files.map((file) => `${folderPath}/${file.name}`);
    const { error: deleteError } = await supabase.storage
      .from('post-images')
      .remove(filePaths);

    if (deleteError) throw deleteError;
  }
};

/**
 * Compress an image file
 * @param file - The file to compress
 * @param maxSizeKB - Maximum size in KB (default: 500)
 * @returns Compressed file
 */
export const compressImage = async (
  file: File,
  maxSizeKB: number = 500
): Promise<File> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions while maintaining aspect ratio
        const maxDimension = 1920;
        if (width > height && width > maxDimension) {
          height = (height * maxDimension) / width;
          width = maxDimension;
        } else if (height > maxDimension) {
          width = (width * maxDimension) / height;
          height = maxDimension;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Try different quality levels to achieve target size
        let quality = 0.9;
        const tryCompress = () => {
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Failed to compress image'));
                return;
              }

              const sizeKB = blob.size / 1024;

              if (sizeKB <= maxSizeKB || quality <= 0.1) {
                // Convert blob to file
                const compressedFile = new File([blob], file.name, {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
              } else {
                // Try with lower quality
                quality -= 0.1;
                tryCompress();
              }
            },
            'image/jpeg',
            quality
          );
        };

        tryCompress();
      };
      img.onerror = () => reject(new Error('Failed to load image'));
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
  });
};
