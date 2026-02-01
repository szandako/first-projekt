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
 * Uses createImageBitmap for better mobile/HEIC support
 * @param file - The file to compress
 * @param maxSizeKB - Maximum size in KB (default: 500)
 * @returns Compressed file
 */
export const compressImage = async (
  file: File,
  maxSizeKB: number = 300
): Promise<File> => {
  // Ha a fájl már elég kicsi, ne tömörítsük
  if (file.size / 1024 <= maxSizeKB) {
    // De JPEG-re konvertáljuk ha lehetséges
    try {
      return await compressWithBitmap(file, maxSizeKB);
    } catch {
      // Ha nem sikerül, visszaadjuk az eredetit
      return file;
    }
  }

  try {
    // Először próbáljuk createImageBitmap-pel (jobb HEIC támogatás)
    return await compressWithBitmap(file, maxSizeKB);
  } catch (bitmapError) {
    console.warn('createImageBitmap failed, trying FileReader fallback:', bitmapError);

    // Fallback: FileReader + Image
    try {
      return await compressWithFileReader(file, maxSizeKB);
    } catch (readerError) {
      console.warn('FileReader compression failed:', readerError);

      // Ha minden kudarcot vall, visszaadjuk az eredetit
      // (max 10MB limit a Supabase-nél alapból)
      console.log('Returning original file without compression');
      return file;
    }
  }
};

/**
 * Compress using createImageBitmap (better mobile support)
 */
const compressWithBitmap = async (file: File, maxSizeKB: number): Promise<File> => {
  // createImageBitmap jobb HEIC/HEIF támogatással rendelkezik
  const bitmap = await createImageBitmap(file);

  let width = bitmap.width;
  let height = bitmap.height;

  // Calculate new dimensions while maintaining aspect ratio
  const maxDimension = 1920;
  if (width > height && width > maxDimension) {
    height = Math.round((height * maxDimension) / width);
    width = maxDimension;
  } else if (height > maxDimension) {
    width = Math.round((width * maxDimension) / height);
    height = maxDimension;
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close(); // Felszabadítjuk a memóriát

  // Try different quality levels to achieve target size
  let quality = 0.9;

  while (quality > 0.1) {
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', quality);
    });

    if (!blob) {
      throw new Error('Failed to create blob');
    }

    const sizeKB = blob.size / 1024;

    if (sizeKB <= maxSizeKB || quality <= 0.1) {
      // Fájlnév kiterjesztését cseréljük .jpg-re
      const newName = file.name.replace(/\.[^.]+$/, '.jpg');
      return new File([blob], newName, {
        type: 'image/jpeg',
        lastModified: Date.now(),
      });
    }

    quality -= 0.1;
  }

  // Ha idáig jutottunk, használjuk a legalacsonyabb minőséget
  const finalBlob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/jpeg', 0.1);
  });

  if (!finalBlob) {
    throw new Error('Failed to create final blob');
  }

  const newName = file.name.replace(/\.[^.]+$/, '.jpg');
  return new File([finalBlob], newName, {
    type: 'image/jpeg',
    lastModified: Date.now(),
  });
};

/**
 * Fallback: compress using FileReader + Image element
 */
const compressWithFileReader = (file: File, maxSizeKB: number): Promise<File> => {
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
                const newName = file.name.replace(/\.[^.]+$/, '.jpg');
                const compressedFile = new File([blob], newName, {
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
