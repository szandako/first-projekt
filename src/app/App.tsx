import React, { useState, useEffect, useCallback, useRef } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { GridCell } from './components/GridCell';
import { EditPostModal } from './components/EditPostModal';
import { NotesModal } from './components/NotesModal';
import { ShareFeedModal } from './components/ShareFeedModal';
import { SharedFeedsModal } from './components/SharedFeedsModal';
import { FeedPreviewModal } from './components/FeedPreviewModal';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { getSupabaseClient } from '../../utils/supabase/client';
import imageCompression from 'browser-image-compression';
import { Users, Instagram, Upload, Save, Trash2, PlusCircle, Loader2, Eye, Edit, Pen, X } from 'lucide-react';

import { HamburgerMenu } from './components/HamburgerMenu';
import { AuthForm } from './components/AuthForm';

const supabase = getSupabaseClient();

interface Post {
  id: number;
  image?: string;
  imagePath?: string; // Store the storage path separately
  caption?: string;
  scheduledTime?: string;
  notes?: string;
}

interface User {
  id: string;
  email: string;
  name?: string;
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<Post[]>(
    Array.from({ length: 9 }, (_, i) => ({ id: i + 1 }))
  );
  const [editingPost, setEditingPost] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [nextId, setNextId] = useState(10);
  const [syncing, setSyncing] = useState(false);
  const [draggedPost, setDraggedPost] = useState<number | null>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [sharedFeedsModalOpen, setSharedFeedsModalOpen] = useState(false);
  const [viewingSharedFeed, setViewingSharedFeed] = useState<{ownerId: string, feedNumber: string, ownerEmail: string} | null>(null);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [hoverProgress, setHoverProgress] = useState<{ [key: number]: number }>({});
  const [hoveredPostId, setHoveredPostId] = useState<number | null>(null);
  const [notesModalOpen, setNotesModalOpen] = useState(false);
  const [editingNotesPostId, setEditingNotesPostId] = useState<number | null>(null);
  const [showRecoveryButton, setShowRecoveryButton] = useState(false);
  const [recovering, setRecovering] = useState(false);
  
  const hasLoadedPosts = useRef(false);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previousPostsRef = useRef<Post[]>([]);
  const hoverTimers = useRef<{ [key: number]: NodeJS.Timeout }>({});

  const serverUrl = `https://${projectId}.supabase.co/functions/v1/make-server-af67b925`;

  // Check for existing session on mount
  useEffect(() => {
    checkSession();
  }, []);

  // Load posts when user logs in (only once using ref)
  useEffect(() => {
    console.log('🔍 useEffect triggered:', { 
      hasUser: !!user, 
      hasToken: !!accessToken, 
      hasLoadedPosts: hasLoadedPosts.current,
      userId: user?.id,
      viewingSharedFeed: !!viewingSharedFeed
    });
    
    // Don't auto-load if viewing a shared feed
    if (viewingSharedFeed) {
      console.log('👀 Currently viewing shared feed, skipping auto-load');
      return;
    }
    
    if (user && accessToken && !hasLoadedPosts.current) {
      console.log('✅ Loading posts for user:', user.id);
      hasLoadedPosts.current = true;
      loadPosts();
    }
    // Only depend on user.id and accessToken, not the full user object
  }, [user?.id, accessToken, viewingSharedFeed]);

  // Auto-save functionality - saves posts when they change
  useEffect(() => {
    // Skip auto-save if:
    // 1. Not logged in
    // 2. Viewing shared feed (read-only)
    // 3. Currently syncing
    // 4. Posts haven't loaded yet (initial load)
    if (!accessToken || viewingSharedFeed || syncing || !hasLoadedPosts.current) {
      return;
    }

    // Check if posts actually changed (not just initial render)
    const postsChanged = JSON.stringify(previousPostsRef.current) !== JSON.stringify(posts);
    if (!postsChanged) {
      previousPostsRef.current = posts;
      return;
    }

    console.log('🔄 Posts changed, triggering auto-save in 2 seconds...');
    setAutoSaveStatus('idle');

    // Clear previous timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // Set new timeout for auto-save (2 seconds after last change)
    autoSaveTimeoutRef.current = setTimeout(async () => {
      console.log('💾 Auto-save triggered!');
      setAutoSaveStatus('saving');
      previousPostsRef.current = posts;
      
      try {
        await performSave();
        setAutoSaveStatus('saved');
        
        // Reset to idle after 3 seconds
        setTimeout(() => {
          setAutoSaveStatus('idle');
        }, 3000);
      } catch (error) {
        console.error('❌ Auto-save failed:', error);
        setAutoSaveStatus('idle');
      }
    }, 2000);

    // Cleanup timeout on unmount
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [posts, accessToken, viewingSharedFeed, syncing]);

  const checkSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        console.log('✅ Found existing session, setting user and token');
        setAccessToken(session.access_token);
        setUser({
          id: session.user.id,
          email: session.user.email || '',
          name: session.user.user_metadata?.name || ''
        });
        
        // Reset the ref to allow loading posts
        hasLoadedPosts.current = false;
        console.log('🔄 Reset hasLoadedPosts to false in checkSession');
      } else {
        console.log('⚠️ No existing session found');
      }
    } catch (error) {
      console.error('Error checking session:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPosts = async () => {
    if (!accessToken) {
      console.log('⚠️ No access token, skipping load');
      return;
    }

    console.log('📥 Starting to load posts from server...');
    setSyncing(true);
    try {
      const response = await fetch(`${serverUrl}/posts`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      console.log('📥 Load response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('📥 Received data:', data);
        console.log('📥 Raw posts from server:', JSON.stringify(data.posts, null, 2));
        
        if (data.posts && data.posts.length > 0) {
          console.log(`📥 Found ${data.posts.length} saved posts`);
          
          // Log each post to see what we got
          data.posts.forEach((post: Post, index: number) => {
            console.log(`Post ${index}:`, {
              id: post.id,
              hasImage: !!post.image,
              imagePrefix: post.image?.substring(0, 50),
              hasCaption: !!post.caption,
              hasScheduledTime: !!post.scheduledTime
            });
          });
          
          // Sort posts by ID to maintain order
          const sortedPosts = [...data.posts].sort((a, b) => a.id - b.id);
          
          // Create a map of ID -> post data
          const postsMap = new Map(sortedPosts.map(p => [p.id, p]));
          
          // Find the max ID
          const maxId = Math.max(...sortedPosts.map((p: Post) => p.id));
          
          // Create array from 1 to maxId, filling in blanks
          const reconstructedPosts: Post[] = [];
          const minLength = Math.max(maxId, 9); // Ensure at least 9 posts
          
          for (let i = 1; i <= minLength; i++) {
            const savedPost = postsMap.get(i);
            if (savedPost) {
              console.log(`📸 Post ${i}:`, {
                hasImage: !!savedPost.image,
                imagePrefix: savedPost.image?.substring(0, 50),
                hasCaption: !!savedPost.caption,
                hasScheduledTime: !!savedPost.scheduledTime,
                hasNotes: !!savedPost.notes
              });
              reconstructedPosts.push({
                id: i, // Use i instead of savedPost.id to ensure sequential IDs
                image: savedPost.image,
                imagePath: savedPost.imagePath, // Add imagePath
                caption: savedPost.caption,
                scheduledTime: savedPost.scheduledTime,
                notes: savedPost.notes
              });
            } else {
              reconstructedPosts.push({ id: i });
            }
          }
          
          console.log('📥 Reconstructed posts with positions:', reconstructedPosts.map(p => ({ id: p.id, hasImage: !!p.image })));
          
          // Check for duplicate IDs before setting
          const ids = reconstructedPosts.map(p => p.id);
          const uniqueIds = new Set(ids);
          if (ids.length !== uniqueIds.size) {
            console.error('❌ DUPLICATE IDS DETECTED:', ids);
            console.error('Unique IDs:', Array.from(uniqueIds));
          }
          
          setPosts(reconstructedPosts);
          setNextId(minLength + 1);
          console.log('✅ Posts loaded successfully with correct positions, nextId:', minLength + 1);
          setShowRecoveryButton(false);
        } else {
          console.log('📥 No saved posts found, showing recovery button');
          setShowRecoveryButton(true);
        }
      } else {
        const errorText = await response.text();
        console.error('❌ Failed to load posts, status:', response.status, 'error:', errorText);
      }
    } catch (error) {
      console.error('❌ Error loading posts:', error);
    } finally {
      setSyncing(false);
    }
  };

  // Helper function to compress images
  const compressImage = async (imageDataUrl: string): Promise<string> => {
    try {
      console.log('🗜️ Compressing image...');
      
      // Convert base64 to blob
      const response = await fetch(imageDataUrl);
      const blob = await response.blob();
      
      console.log(`📊 Original size: ${(blob.size / 1024 / 1024).toFixed(2)}MB`);
      
      // If image is already small enough, return as-is
      if (blob.size < 500000) { // Less than 500KB
        console.log('✅ Image already small enough, skipping compression');
        return imageDataUrl;
      }
      
      // Compress the image
      const options = {
        maxSizeMB: 0.5, // Max size 500KB (reduced from 1MB)
        maxWidthOrHeight: 1080, // Max dimension (Instagram size)
        useWebWorker: true,
        fileType: blob.type
      };
      
      const compressedFile = await imageCompression(blob as File, options);
      console.log(`📊 Compressed size: ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`);
      
      // Convert back to base64
      const reader = new FileReader();
      const compressedDataUrl = await new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(compressedFile);
      });
      
      console.log('✅ Image compressed successfully');
      return compressedDataUrl;
    } catch (error) {
      console.warn('⚠️ Compression failed, using original:', error);
      return imageDataUrl; // Return original if compression fails
    }
  };

  const savePost = async (post: Post) => {
    if (!accessToken || !post.image) {
      console.log('⚠️ Skipping save for post:', post.id, '(no token or image)');
      return;
    }

    console.log(`💾 Saving post ${post.id}...`);
    try {
      let imageToSave = post.image;
      
      // Compress image if it's a base64 data URL
      if (post.image.startsWith('data:')) {
        imageToSave = await compressImage(post.image);
      }
      
      const response = await fetch(`${serverUrl}/posts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...post,
          image: imageToSave
        })
      });

      console.log(`📡 Response status for post ${post.id}:`, response.status);

      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Post ${post.id} saved successfully:`, data);
      } else {
        const errorData = await response.json();
        console.error(`❌ Failed to save post ${post.id}, status:`, response.status, 'error:', errorData);
      }
    } catch (error) {
      console.error(`❌ Error saving post ${post.id}:`, error);
    }
  };

  // Shared save logic used by both manual save and auto-save
  const performSave = async () => {
    if (!accessToken) {
      console.log('⚠️ No access token, cannot save');
      return;
    }

    console.log('💾 Performing save...');
    console.log('📸 Current posts state:', posts.map((p, i) => ({ 
      index: i, 
      postId: p.id, 
      hasImage: !!p.image,
      imagePrefix: p.image?.substring(0, 30),
      hasCaption: !!p.caption,
      hasScheduledTime: !!p.scheduledTime
    })));
    
    try {
      // Step 0: Get existing posts to preserve imagePaths
      console.log('📥 Loading existing posts to preserve image paths...');
      const getResponse = await fetch(`${serverUrl}/posts`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      const imagePathMap = new Map<string, string>();
      if (getResponse.ok) {
        const { posts: existingPosts } = await getResponse.json();
        existingPosts.forEach((p: any) => {
          if (p.image && p.imagePath) {
            imagePathMap.set(p.image, p.imagePath);
            console.log(`  📂 Mapped: ${p.image.substring(0, 50)}... -> ${p.imagePath}`);
          }
        });
        console.log(`✅ Preserved ${imagePathMap.size} image paths`);
      }

      // Step 1: Delete ALL existing posts from database
      console.log('🗑️ Deleting all existing posts...');
      const deleteResponse = await fetch(`${serverUrl}/posts`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (deleteResponse.ok) {
        const deleteData = await deleteResponse.json();
        console.log(`✅ Deleted ${deleteData.deletedCount} posts from database`);
      }

      // Step 2: Save current posts at their EXACT visual positions (index + 1)
      // Only save posts that have images
      console.log('💾 Saving posts at their visual positions...');
      
      const savePromises = posts
        .map((post, index) => ({
          post,
          visualPosition: index + 1, // This is the EXACT position in the grid
          arrayIndex: index
        }))
        .filter(({ post }) => post.image) // Only save if there's an image
        .map(async ({ post, visualPosition, arrayIndex }) => {
          let imageToSave = post.image!;
          
          console.log(`💾 Saving position ${visualPosition} (array index ${arrayIndex}, post.id ${post.id})`);
          console.log(`  📂 Post has imagePath:`, post.imagePath);
          
          // Priority 1: Use the imagePath if we already have it (from previous load)
          if (post.imagePath) {
            imageToSave = `EXISTING_PATH:${post.imagePath}`;
            console.log(`  ✅ Using stored imagePath: ${post.imagePath}`);
          }
          // Priority 2: Compress if it's a NEW base64 image (not a signed URL)
          else if (imageToSave.startsWith('data:')) {
            console.log(`  🗜️ Compressing new image`);
            imageToSave = await compressImage(imageToSave);
          } 
          // Priority 3: Try to find existing path from the map (fallback)
          else if (imageToSave.startsWith('https://')) {
            console.log(`  ♻️ Image is a signed URL, checking for existing path...`);
            // Check if we have the imagePath from before deletion
            const existingPath = imagePathMap.get(imageToSave);
            if (existingPath) {
              imageToSave = `EXISTING_PATH:${existingPath}`;
              console.log(`  📂 Using preserved path from map: ${existingPath}`);
            } else {
              console.log(`  ⚠️ No preserved path found for this URL`);
            }
          }
          
          // Save with visualPosition as the ID
          const response = await fetch(`${serverUrl}/posts`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              id: visualPosition, // Use visual position as ID!
              image: imageToSave,
              caption: post.caption || null,
              scheduledTime: post.scheduledTime || null,
              notes: post.notes || null
            })
          });

          if (!response.ok) {
            const errorData = await response.json();
            console.error(`❌ Failed to save position ${visualPosition}:`, errorData);
            throw new Error(`Failed to save position ${visualPosition}`);
          }

          const data = await response.json();
          console.log(`✅ Position ${visualPosition} saved successfully`);
          return data;
        });

      await Promise.all(savePromises);
      
      console.log('✅ All posts saved successfully!');
      console.log('📋 Summary: Saved posts at their exact visual positions');
    } catch (error) {
      console.error('❌ Error during save:', error);
      throw error;
    }
  };

  const handleSaveAll = async () => {
    if (!accessToken) {
      console.log('⚠️ No access token, cannot save');
      return;
    }

    console.log('💾 Starting save process...');
    console.log('📸 Current posts state:', posts.map((p, i) => ({ 
      index: i, 
      postId: p.id, 
      hasImage: !!p.image,
      imagePrefix: p.image?.substring(0, 30),
      hasCaption: !!p.caption,
      hasScheduledTime: !!p.scheduledTime
    })));
    
    setSyncing(true);
    try {
      await performSave();
      alert('✅ Minden mentve!');
    } catch (error) {
      console.error('❌ Error saving all posts:', error);
      alert('❌ Hiba történt a mentés során. Kérlek próbáld újra.');
    } finally {
      setSyncing(false);
    }
  };

  const handleLogin = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new Error(error.message);
    }

    if (data.session) {
      console.log('✅ Login successful, setting user and token');
      setAccessToken(data.session.access_token);
      setUser({
        id: data.user.id,
        email: data.user.email || '',
        name: data.user.user_metadata?.name || ''
      });
      
      // Reset the ref to allow loading posts
      hasLoadedPosts.current = false;
      console.log('🔄 Reset hasLoadedPosts to false after login');
    }
  };

  const handleSignup = async (email: string, password: string, name: string) => {
    try {
      console.log('Attempting signup to:', `${serverUrl}/auth/signup`);
      
      const response = await fetch(`${serverUrl}/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({ email, password, name })
      });

      console.log('Signup response status:', response.status);

      const data = await response.json();
      console.log('Signup response data:', data);

      if (!response.ok) {
        console.error('Signup error response:', data);
        const errorMessage = data.error || 'Regisztrációs hiba történt. Kérlek próbáld újra később.';
        throw new Error(errorMessage);
      }

      // After signup, log the user in
      await handleLogin(email, password);
    } catch (error: any) {
      console.error('Signup error caught:', error);
      
      // Provide more specific error messages
      if (error.message.includes('fetch')) {
        throw new Error('Nem sikerült kapcsolódni a szerverhez. Kérlek próbáld újra később.');
      }
      
      throw new Error(error.message || 'Regisztrációs hiba történt. Kérlek próbáld újra később.');
    }
  };

  const handleForceRecovery = async () => {
    if (!accessToken || recovering) return;
    
    setRecovering(true);
    try {
      const response = await fetch(`${serverUrl}/force-recovery`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ RECOVERY SUCCESSFUL:', data);
        alert(`🎉 ${data.restored} KÉP VISSZAÁLLÍTVA!`);
        
        // Reload posts
        hasLoadedPosts.current = false;
        await loadPosts();
        setShowRecoveryButton(false);
      } else {
        const errorData = await response.json();
        console.error('❌ Recovery failed:', errorData);
        alert('❌ Hiba történt: ' + (errorData.error || 'Ismeretlen hiba'));
      }
    } catch (error) {
      console.error('❌ Recovery error:', error);
      alert('❌ Kapcsolódási hiba történt');
    } finally {
      setRecovering(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setAccessToken(null);
    setPosts(Array.from({ length: 9 }, (_, i) => ({ id: i + 1 })));
    setNextId(10);
    hasLoadedPosts.current = false;
    setShowRecoveryButton(false);
    console.log('🚪 Logged out, reset hasLoadedPosts to false');
  };

  const handleImageDrop = useCallback(async (id: number, image: string) => {
    // Compress image before setting it
    const compressedImage = await compressImage(image);
    setPosts((prev) => 
      prev.map((post) => (post.id === id ? { ...post, image: compressedImage } : post))
    );
  }, []);

  const handleImageLoad = useCallback(async (id: number, imageData: string) => {
    if (viewingSharedFeed) return; // Prevent editing in read-only mode
    const compressedImage = await compressImage(imageData);
    setPosts((prev) =>
      prev.map((post) => (post.id === id ? { ...post, image: compressedImage } : post))
    );
  }, [viewingSharedFeed]);

  const handleDragStart = useCallback((id: number) => {
    if (viewingSharedFeed) return; // Prevent dragging in read-only mode
    setDraggedPost(id);
  }, [viewingSharedFeed]);

  const handlePaste = useCallback((id: number) => {
    if (viewingSharedFeed) return; // Prevent paste in read-only mode
    // This will be handled by the GridCell component
  }, [viewingSharedFeed]);

  const handleEditClick = useCallback((id: number) => {
    if (viewingSharedFeed) return; // Prevent editing in read-only mode
    handleEditPost(id);
  }, [viewingSharedFeed]);

  const handleMouseEnter = useCallback((id: number) => {
    const post = posts.find(p => p.id === id);
    if (!post?.image) return;

    // Set hovered post ID for tooltip (works in both modes)
    setHoveredPostId(id);

    // Only do progress animation if NOT viewing shared feed
    if (viewingSharedFeed) return;

    // Start progress animation
    let progress = 0;
    const interval = setInterval(() => {
      progress += 3.33; // 100 / 30 frames = ~3.33% per frame (for 3 seconds at 60fps -> 30 frames)
      setHoverProgress(prev => ({ ...prev, [id]: Math.min(progress, 100) }));

      if (progress >= 100) {
        clearInterval(interval);
        // Open modal when progress reaches 100%
        handleEditPost(id);
        // Reset progress
        setHoverProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[id];
          return newProgress;
        });
      }
    }, 100); // Update every 100ms

    hoverTimers.current[id] = interval;
  }, [posts, viewingSharedFeed]);

  const handleMouseLeave = useCallback((id: number) => {
    // Always clear hovered post ID
    setHoveredPostId(null);

    // Clear timer and reset progress (only relevant if not in shared mode)
    if (hoverTimers.current[id]) {
      clearInterval(hoverTimers.current[id]);
      delete hoverTimers.current[id];
    }
    setHoverProgress(prev => {
      const newProgress = { ...prev };
      delete newProgress[id];
      return newProgress;
    });
  }, []);

  const handleSwapPosts = useCallback((dragId: number, dropId: number) => {
    console.log(`🔄 Swapping posts: ${dragId} <-> ${dropId}`);
    setPosts((prev) => {
      const dragPost = prev.find(p => p.id === dragId);
      const dropPost = prev.find(p => p.id === dropId);
      
      if (!dragPost || !dropPost) return prev;
      
      // Swap the content (image, imagePath, caption, scheduledTime) but keep IDs
      return prev.map(post => {
        if (post.id === dragId) {
          return {
            id: dragId,
            image: dropPost.image,
            imagePath: dropPost.imagePath, // Preserve imagePath!
            caption: dropPost.caption,
            scheduledTime: dropPost.scheduledTime
          };
        }
        if (post.id === dropId) {
          return {
            id: dropId,
            image: dragPost.image,
            imagePath: dragPost.imagePath, // Preserve imagePath!
            caption: dragPost.caption,
            scheduledTime: dragPost.scheduledTime
          };
        }
        return post;
      });
    });
  }, []);

  const updatePost = useCallback((id: number, updates: Partial<Post>) => {
    setPosts((prev) =>
      prev.map((post) => (post.id === id ? { ...post, ...updates } : post))
    );
  }, []);

  const handleEditPost = (id: number) => {
    setEditingPost(id);
    setModalOpen(true);
  };

  const handleSavePost = (caption: string, scheduledTime: string, notes: string) => {
    if (editingPost) {
      setPosts((prev) =>
        prev.map((post) =>
          post.id === editingPost ? { ...post, caption, scheduledTime, notes } : post
        )
      );
    }
  };

  const handleRemoveImage = (id: number) => {
    setPosts((prev) =>
      prev.map((post) =>
        post.id === id
          ? { id: post.id, caption: undefined, scheduledTime: undefined, image: undefined, imagePath: undefined, notes: undefined }
          : post
      )
    );
  };

  const handleClearAll = () => {
    if (window.confirm('Biztosan törölni szeretnéd az összes képet?')) {
      setPosts(Array.from({ length: 9 }, (_, i) => ({ id: i + 1 })));
      setNextId(10);
    }
  };

  const handleDeleteAllFromDatabase = async () => {
    if (!window.confirm('⚠️ FIGYELEM!\n\nEz véglegesen törli az ÖSSZES képet:\n• A Supabase adatbázisból\n• Az aktuális feedből (képernyőről)\n\nBiztosan folytatod?')) {
      return;
    }

    if (!accessToken) {
      alert('Nincs bejelentkezve!');
      return;
    }

    setSyncing(true);
    try {
      const response = await fetch(`${serverUrl}/posts`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        
        // Clear the local state
        setPosts(Array.from({ length: 9 }, (_, i) => ({ id: i + 1 })));
        setNextId(10);
        
        alert(`✅ Sikeresen törölve!\n\n• ${data.deletedCount} kép törölve az adatbázisból\n• Feed kiürítve`);
      } else {
        const error = await response.json();
        console.error('Delete error:', error);
        alert('❌ Hiba történt a törlés során. Kérlek próbáld újra.');
      }
    } catch (error) {
      console.error('Error deleting all posts from database:', error);
      alert('❌ Hiba történt a törlés során. Kérlek próbáld újra.');
    } finally {
      setSyncing(false);
    }
  };

  const handleOpenNotesModal = (postId: number) => {
    console.log('📝 Opening notes modal for post:', postId);
    setEditingNotesPostId(postId);
    setNotesModalOpen(true);
  };

  const handleSaveNotes = async (notes: string) => {
    if (!editingNotesPostId || !accessToken) {
      console.error('❌ Cannot save notes: missing post ID or access token');
      return;
    }

    console.log('💾 Saving notes for post:', editingNotesPostId);

    try {
      // Determine the owner ID (either current user or shared feed owner)
      const ownerId = viewingSharedFeed ? viewingSharedFeed.ownerId : user?.id;
      const feedNumber = viewingSharedFeed ? viewingSharedFeed.feedNumber : '1';

      if (!ownerId) {
        throw new Error('Owner ID not found');
      }

      const url = `${serverUrl}/feeds/${ownerId}/${feedNumber}/posts/${editingNotesPostId}/notes`;
      console.log('📡 Sending notes update to:', url);

      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ notes })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Hiba történt a mentés során');
      }

      const data = await response.json();
      console.log('✅ Notes saved successfully:', data);

      // Update local state
      setPosts(prev =>
        prev.map(post =>
          post.id === editingNotesPostId
            ? { ...post, notes: notes || undefined }
            : post
        )
      );

      console.log('✅ Local state updated');
    } catch (error: any) {
      console.error('❌ Error saving notes:', error);
      throw error;
    }
  };

  const handleAddCell = () => {
    setPosts((prev) => {
      // Check if nextId already exists to avoid duplicates
      const existingIds = prev.map(p => p.id);
      if (existingIds.includes(nextId)) {
        console.error('❌ Duplicate ID detected in handleAddCell:', nextId);
        // Find the actual next available ID
        const maxExistingId = Math.max(...existingIds);
        const newId = maxExistingId + 1;
        setNextId(newId + 1);
        return [{ id: newId }, ...prev];
      }
      
      const newPost = { id: nextId };
      return [newPost, ...prev];
    });
    setNextId((prev) => prev + 1);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    console.log('📤 handleFileUpload started, files:', files.length);
    const fileArray = Array.from(files);
    
    // Process files sequentially to avoid memory issues
    for (const file of fileArray) {
      if (file.type.startsWith('image/')) {
        console.log('  📷 Processing image file:', file.name);
        const reader = new FileReader();
        reader.onload = async (event) => {
          if (event.target?.result) {
            console.log('  ✅ File loaded, compressing...');
            // Compress image immediately after loading
            const compressedImage = await compressImage(event.target.result as string);
            console.log('  ✅ Compression done, updating posts state...');
            
            setPosts((prevPosts) => {
              console.log('  📋 Current posts before update:', prevPosts.map(p => ({ id: p.id, hasImage: !!p.image })));
              const emptyPost = prevPosts.find((p) => !p.image);
              if (emptyPost) {
                const updatedPosts = prevPosts.map((p) =>
                  p.id === emptyPost.id ? { ...p, image: compressedImage } : p
                );
                console.log('  ✅ Updated posts:', updatedPosts.map(p => ({ id: p.id, hasImage: !!p.image })));
                return updatedPosts;
              }
              console.log('  ⚠️ No empty post found!');
              return prevPosts;
            });
          }
        };
        reader.readAsDataURL(file);
      }
    }

    e.target.value = '';
  };

  const handleShareFeed = async (email: string) => {
    if (!accessToken) {
      throw new Error('Nincs bejelentkezve!');
    }

    try {
      const response = await fetch(`${serverUrl}/feeds/share`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          email,
          feedNumber: '1' // Currently always feed 1, can be extended later
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Hiba történt a megosztás során');
      }

      const data = await response.json();
      console.log('✅ Feed shared successfully:', data);
    } catch (error: any) {
      console.error('❌ Error sharing feed:', error);
      throw error;
    }
  };

  const handleViewSharedFeed = async (ownerId: string, feedNumber: string, ownerEmail: string) => {
    console.log('👀 Viewing shared feed:', { ownerId, feedNumber, ownerEmail });
    setSharedFeedsModalOpen(false);
    setViewingSharedFeed({ ownerId, feedNumber, ownerEmail });
    
    // Load the shared feed
    setSyncing(true);
    try {
      const url = `${serverUrl}/feeds/view/${ownerId}/${feedNumber}`;
      console.log('📥 Fetching shared feed from:', url);
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      console.log('📥 Response status:', response.status);

      if (!response.ok) {
        const error = await response.json();
        console.error('❌ Error response:', error);
        throw new Error(error.error || 'Hiba történt a feed betöltése során');
      }

      const data = await response.json();
      console.log('📥 Shared feed data received:', data);
      console.log('📥 Number of posts:', data.posts?.length);
      
      if (data.posts && data.posts.length > 0) {
        console.log('✅ Processing shared feed posts...');
        const sortedPosts = [...data.posts].sort((a, b) => a.id - b.id);
        const postsMap = new Map(sortedPosts.map(p => [p.id, p]));
        const maxId = Math.max(...sortedPosts.map((p: Post) => p.id));
        const reconstructedPosts: Post[] = [];
        const minLength = Math.max(maxId, 9);
        
        for (let i = 1; i <= minLength; i++) {
          const savedPost = postsMap.get(i);
          if (savedPost) {
            console.log(`📸 Post ${i}:`, {
              hasImage: !!savedPost.image,
              imagePrefix: savedPost.image?.substring(0, 50),
              hasCaption: !!savedPost.caption,
              hasScheduledTime: !!savedPost.scheduledTime,
              hasNotes: !!savedPost.notes
            });
            reconstructedPosts.push({
              id: i,
              image: savedPost.image,
              caption: savedPost.caption,
              scheduledTime: savedPost.scheduledTime,
              notes: savedPost.notes
            });
          } else {
            reconstructedPosts.push({ id: i });
          }
        }
        
        console.log('✅ Setting shared feed posts, count:', reconstructedPosts.length);
        setPosts(reconstructedPosts);
        setNextId(minLength + 1);
      } else {
        console.log('ℹ️ No posts in shared feed, showing empty grid');
        setPosts(Array.from({ length: 9 }, (_, i) => ({ id: i + 1 })));
        setNextId(10);
      }
    } catch (error: any) {
      console.error('❌ Error viewing shared feed:', error);
      alert(error.message || 'Hiba történt a feed betöltése során');
      // Reset viewing state on error
      setViewingSharedFeed(null);
    } finally {
      setSyncing(false);
    }
  };

  const handleBackToMyFeed = async () => {
    console.log('🔙 Returning to my feed...');
    
    // First, clear the viewing state and reset posts to empty grid
    setViewingSharedFeed(null);
    setPosts(Array.from({ length: 9 }, (_, i) => ({ id: i + 1 })));
    setNextId(10);
    
    // Then load the user's own feed
    setSyncing(true);
    hasLoadedPosts.current = false;
    
    try {
      await loadPosts();
      console.log('✅ Successfully loaded my feed');
    } catch (error) {
      console.error('❌ Error loading my feed:', error);
    } finally {
      setSyncing(false);
    }
  };

  const editingPostData = posts.find((p) => p.id === editingPost);
  const editingNotesPostData = posts.find((p) => p.id === editingNotesPostId);
  const filledCount = posts.filter((p) => p.image).length;

  // Show loading screen
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-stone-700 mx-auto mb-4" />
          <p className="text-stone-600">Betöltés...</p>
        </div>
      </div>
    );
  }

  // Show auth form if not logged in
  if (!user) {
    return <AuthForm onLogin={handleLogin} onSignup={handleSignup} />;
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="min-h-screen bg-stone-50">
        {/* Header */}
        <header className="bg-white border-b border-stone-200 sticky top-0 z-40 shadow-sm">
          <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4 lg:px-8">
            <div className="flex items-center justify-between gap-2">
              {/* Logo & Title */}
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                <div className="bg-stone-800 p-2 sm:p-2.5 rounded-lg flex-shrink-0">
                  <Instagram className="w-5 h-5 sm:w-6 sm:h-6 text-stone-100" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-stone-900 truncate">
                    Instagram Feed
                  </h1>
                  <p className="text-xs sm:text-sm text-stone-600 hidden sm:block">
                    Tervezd meg a következő posztjaidat
                  </p>
                </div>
              </div>

              {/* Right Side Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Auto-save Status Indicator */}
                {!viewingSharedFeed && autoSaveStatus !== 'idle' && (
                  <div className={`flex items-center gap-2 px-2 sm:px-3 py-2 rounded-lg border ${
                    autoSaveStatus === 'saving' 
                      ? 'bg-blue-50 border-blue-200' 
                      : 'bg-emerald-50 border-emerald-200'
                  }`}>
                    {autoSaveStatus === 'saving' ? (
                      <Loader2 className="w-4 h-4 animate-spin text-blue-700" />
                    ) : (
                      <Save className="w-4 h-4 text-emerald-700" />
                    )}
                    <span className={`text-sm hidden sm:inline ${
                      autoSaveStatus === 'saving' ? 'text-blue-700' : 'text-emerald-700'
                    }`}>
                      {autoSaveStatus === 'saving' ? 'Automatikus mentés...' : 'Mentve ✓'}
                    </span>
                  </div>
                )}
                
                {/* Image Counter */}
                <div className="hidden md:flex items-center gap-2 px-3 py-2 bg-stone-100 rounded-lg">
                  <span className="text-sm text-stone-700">
                    {filledCount} / {posts.length}
                  </span>
                </div>

                {/* Syncing Indicator */}
                {syncing && (
                  <div className="flex items-center gap-2 px-2 sm:px-3 py-2 bg-amber-50 rounded-lg border border-amber-200">
                    <Loader2 className="w-4 h-4 animate-spin text-amber-700" />
                    <span className="text-sm text-amber-700 hidden sm:inline">Szinkronizálás...</span>
                  </div>
                )}

                {/* Upload Button */}
                {!viewingSharedFeed && (
                  <label className="cursor-pointer px-3 sm:px-4 py-2 bg-stone-800 text-stone-100 rounded-lg hover:bg-stone-900 transition-all shadow-sm hover:shadow-md flex items-center gap-2">
                    <Upload className="w-4 h-4" />
                    <span className="hidden lg:inline">Képek feltöltése</span>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                )}

                {/* Save Button (only if there are images and not viewing shared) */}
                {filledCount > 0 && !viewingSharedFeed && (
                  <>
                    <button
                      onClick={handleSaveAll}
                      disabled={syncing}
                      className="px-3 sm:px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all shadow-sm hover:shadow-md flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Save className="w-4 h-4" />
                      <span className="hidden lg:inline">Mentés</span>
                    </button>

                    {/* Clear All Button (desktop only) */}
                    <button
                      onClick={handleClearAll}
                      className="hidden lg:flex px-4 py-2 bg-stone-200 text-stone-800 hover:bg-stone-300 rounded-lg transition-colors items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Törlés</span>
                    </button>
                  </>
                )}

                {/* Hamburger Menu */}
                <HamburgerMenu
                  user={user}
                  onLogout={handleLogout}
                  onDeleteAll={handleDeleteAllFromDatabase}
                  onShareFeed={() => setShareModalOpen(true)}
                  onViewSharedFeeds={() => setSharedFeedsModalOpen(true)}
                />
              </div>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          {/* Force Recovery Button */}
          {showRecoveryButton && !viewingSharedFeed && (
            <div className="mb-6 p-6 bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-xl shadow-lg">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-stone-900 mb-1">
                    🔍 Képek találhatók a Storage-ban!
                  </h3>
                  <p className="text-sm text-stone-700">
                    Úgy tűnik vannak elmentett képeid a rendszerben, de nincsenek betöltve. 
                    Kattints a gombra az összes kép visszaállításához.
                  </p>
                </div>
                <button
                  onClick={handleForceRecovery}
                  disabled={recovering}
                  className="px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-lg hover:from-amber-700 hover:to-orange-700 transition-all shadow-md hover:shadow-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {recovering ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Visszaállítás...
                    </>
                  ) : (
                    <>
                      ♻️ KÉPEK VISSZAÁLLÍTÁSA
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
          {/* Viewing Shared Feed Banner */}
          {viewingSharedFeed && (
            <div className="mb-6 p-6 bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl shadow-lg border-2 border-blue-500">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-white/20 p-3 rounded-lg">
                    <Users className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1">
                      👀 Megosztott Feed Megtekintése
                    </h3>
                    <p className="text-blue-100">
                      {viewingSharedFeed.ownerEmail} feedje (Feed {viewingSharedFeed.feedNumber})
                    </p>
                    <p className="text-xs text-blue-200 mt-1">
                      🔒 Csak olvasható - nem szerkesztheted
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {filledCount > 0 && (
                    <button
                      onClick={() => setPreviewModalOpen(true)}
                      className="px-4 py-3 bg-white/10 backdrop-blur-sm text-white border border-white/20 rounded-lg hover:bg-white/20 transition-all shadow-md hover:shadow-lg flex items-center gap-2"
                    >
                      <Eye className="w-5 h-5" />
                      <span className="font-medium">Előnézet</span>
                    </button>
                  )}
                  <button
                    onClick={handleBackToMyFeed}
                    className="px-6 py-3 bg-white text-blue-700 font-semibold rounded-lg hover:bg-blue-50 transition-all shadow-md hover:shadow-lg flex items-center gap-2"
                  >
                    <Instagram className="w-5 h-5" />
                    Vissza a feedemhez
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Instructions */}
          {!viewingSharedFeed && (
            <div className="mb-8 p-6 bg-white rounded-lg border border-stone-200 shadow-sm">
              <h2 className="text-lg font-semibold mb-3 text-stone-900">
                🎯 Használati útmutató
              </h2>
              <ul className="space-y-2 text-stone-700">
                <li>
                  <strong>1.</strong> Húzd a képeket az üres cellákba vagy használd a{' '}
                  <strong>Képek feltöltése</strong> gombot
                </li>
                <li>
                  <strong>2.</strong> Vagy kattints egy cellára és nyomd meg a{' '}
                  <strong>Ctrl+V</strong>-t beillesztéshez
                </li>
                <li>
                  <strong>3.</strong> Tartsd az egeret egy kép felett <strong>3 másodpercig</strong> a
                  caption és időzítés szerkesztéséhez
                </li>
                <li>
                  <strong>4.</strong> Kattints a <strong>Mentés</strong> gombra a képek adatbázisba
                  mentéséhez
                </li>
              </ul>
            </div>
          )}

          {/* Add Cell & Preview Buttons */}
          {!viewingSharedFeed && (
            <div className="mb-4 flex justify-center gap-3">
              <button
                onClick={handleAddCell}
                className="px-6 py-3 bg-white border-2 border-dashed border-stone-300 hover:border-stone-500 hover:bg-stone-50 rounded-lg transition-all shadow-sm hover:shadow-md flex items-center gap-3 group"
              >
                <PlusCircle className="w-5 h-5 text-stone-400 group-hover:text-stone-700 transition-colors" />
                <span className="font-medium text-stone-600 group-hover:text-stone-900 transition-colors">
                  Új cella hozzáadása
                </span>
              </button>
              
              {filledCount > 0 && (
                <button
                  onClick={() => setPreviewModalOpen(true)}
                  className="px-6 py-3 bg-gradient-to-r from-stone-700 to-stone-800 text-white rounded-lg hover:from-stone-800 hover:to-stone-900 transition-all shadow-sm hover:shadow-md flex items-center gap-3 group"
                >
                  <Eye className="w-5 h-5" />
                  <span className="font-medium">
                    Feed Előnézet
                  </span>
                </button>
              )}
            </div>
          )}

          {/* Grid */}
          <div className="grid grid-cols-3 gap-0.5 mb-16">
            {posts.map(post => (
              <div
                key={post.id}
                className="aspect-[4/5] bg-stone-100 rounded-sm overflow-hidden relative group cursor-pointer"
                draggable={!!post.image && draggedPost === null} // Only draggable if no other drag in progress
                onDragStart={(e) => {
                  if (post.image) {
                    setDraggedPost(post.id);
                    e.dataTransfer.effectAllowed = 'move';
                  }
                }}
                onDragEnd={() => {
                  setDraggedPost(null);
                }}
                onDragOver={(e) => {
                  // Allow both internal swaps and external file drops
                  if (draggedPost !== null && draggedPost !== post.id) {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                  } else if (e.dataTransfer.types.includes('Files')) {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'copy';
                  }
                }}
                onDrop={async (e) => {
                  e.preventDefault();
                  
                  // Check if we're swapping posts (internal drag)
                  if (draggedPost !== null && draggedPost !== post.id) {
                    handleSwapPosts(draggedPost, post.id);
                    setDraggedPost(null);
                    return;
                  }
                  
                  // Check if we're dropping external files
                  const files = e.dataTransfer.files;
                  if (files && files.length > 0) {
                    const file = files[0];
                    if (file.type.startsWith('image/')) {
                      console.log('📷 Dropping external image file:', file.name);
                      const reader = new FileReader();
                      reader.onload = async (event) => {
                        if (event.target?.result) {
                          console.log('  ✅ File loaded, compressing...');
                          const compressedImage = await compressImage(event.target.result as string);
                          console.log('  ✅ Compressed, updating post...');
                          updatePost(post.id, { image: compressedImage });
                        }
                      };
                      reader.readAsDataURL(file);
                    }
                  }
                }}
                onPaste={async (e) => {
                  // Handle paste from clipboard
                  const items = e.clipboardData?.items;
                  if (!items) return;

                  for (let i = 0; i < items.length; i++) {
                    if (items[i].type.indexOf('image') !== -1) {
                      const file = items[i].getAsFile();
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          const result = event.target?.result as string;
                          updatePost(post.id, { image: result });
                        };
                        reader.readAsDataURL(file);
                      }
                      break;
                    }
                  }
                }}
                onMouseEnter={() => handleMouseEnter(post.id)}
                onMouseLeave={() => handleMouseLeave(post.id)}
              >
                {/* Drag indicator overlay */}
                {draggedPost !== null && draggedPost !== post.id && post.image && (
                  <div className="absolute inset-0 bg-blue-500 bg-opacity-20 border-2 border-blue-500 border-dashed z-10 pointer-events-none flex items-center justify-center">
                    <div className="bg-white px-3 py-2 rounded-lg shadow-lg">
                      <span className="text-sm font-medium text-blue-700">Cseréld ide</span>
                    </div>
                  </div>
                )}
                
                {/* Currently dragging overlay */}
                {draggedPost === post.id && (
                  <div className="absolute inset-0 bg-stone-900 bg-opacity-50 z-20 pointer-events-none flex items-center justify-center">
                    <div className="bg-white px-3 py-2 rounded-lg shadow-lg">
                      <span className="text-sm font-medium text-stone-700">Húzd ide</span>
                    </div>
                  </div>
                )}
                
                {/* Image or placeholder */}
                {post.image ? (
                  <img
                    src={post.image}
                    alt={`Post ${post.id}`}
                    className="w-full h-full object-cover"
                    onLoad={() => handleImageLoad(post.id, post.image!)}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-stone-400">
                    <Upload className="w-6 h-6" />
                  </div>
                )}
                
                {/* Hover Progress Circle */}
                {post.image && hoverProgress[post.id] && hoverProgress[post.id] > 0 && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40 pointer-events-none z-30">
                    <svg className="w-20 h-20 transform -rotate-90">
                      <circle
                        cx="40"
                        cy="40"
                        r="36"
                        stroke="rgba(255, 255, 255, 0.2)"
                        strokeWidth="4"
                        fill="none"
                      />
                      <circle
                        cx="40"
                        cy="40"
                        r="36"
                        stroke="white"
                        strokeWidth="4"
                        fill="none"
                        strokeDasharray={`${2 * Math.PI * 36}`}
                        strokeDashoffset={`${2 * Math.PI * 36 * (1 - hoverProgress[post.id] / 100)}`}
                        strokeLinecap="round"
                        className="transition-all duration-100"
                      />
                    </svg>
                    <div className="absolute text-white font-bold text-lg">
                      {Math.round(hoverProgress[post.id])}%
                    </div>
                  </div>
                )}
                
                {/* Shared Feed Hover Info Tooltip */}
                {viewingSharedFeed && post.image && hoveredPostId === post.id && (post.caption || post.scheduledTime || post.notes) && (
                  <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/70 flex flex-col items-center justify-center p-4 z-30 pointer-events-none">
                    <div className="w-full max-h-full overflow-y-auto space-y-3">
                      {post.scheduledTime && (
                        <div className="bg-white/95 rounded-lg p-3 shadow-lg">
                          <div className="text-xs font-semibold text-stone-500 mb-1">
                            ⏰ Tervezett időpont
                          </div>
                          <div className="text-sm text-stone-900">
                            {new Date(post.scheduledTime).toLocaleString('hu-HU', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </div>
                      )}
                      {post.caption && (
                        <div className="bg-white/95 rounded-lg p-3 shadow-lg">
                          <div className="text-xs font-semibold text-stone-500 mb-1">
                            📝 Caption
                          </div>
                          <div className="text-sm text-stone-900 whitespace-pre-wrap max-h-32 overflow-y-auto">
                            {post.caption}
                          </div>
                        </div>
                      )}
                      {post.notes && (
                        <div className="bg-amber-50 rounded-lg p-3 shadow-lg border border-amber-200">
                          <div className="text-xs font-semibold text-amber-700 mb-1">
                            💭 Megjegyzések
                          </div>
                          <div className="text-sm text-stone-900 whitespace-pre-wrap max-h-32 overflow-y-auto">
                            {post.notes}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Notes Icon - Top Right (only in shared feed view) */}
                {post.image && viewingSharedFeed && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenNotesModal(post.id);
                    }}
                    className="absolute top-2 right-2 z-20 p-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-all shadow-lg opacity-0 group-hover:opacity-100 pointer-events-auto"
                    title="Collaborative megjegyzések szerkesztése"
                  >
                    <Pen className="w-4 h-4" />
                  </button>
                )}

                {/* Delete Image Button - Top Right (only when NOT viewing shared feed) */}
                {post.image && !viewingSharedFeed && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm('Biztosan törölni szeretnéd ezt a képet?')) {
                        handleRemoveImage(post.id);
                      }
                    }}
                    className="absolute top-2 right-2 z-20 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-all shadow-lg opacity-0 group-hover:opacity-100 pointer-events-auto"
                    title="Kép törlése"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}

                {/* Status Indicators - Bottom Left */}
                {post.image && (
                  <div className="absolute bottom-2 left-2 flex flex-col gap-1 z-20 pointer-events-none">
                    {/* Caption Status */}
                    {post.caption ? (
                      <div className="px-2 py-1 bg-emerald-500 text-white text-xs font-semibold rounded shadow-lg">
                        ✓ Caption beállítva
                      </div>
                    ) : (
                      <div className="px-2 py-1 bg-red-500 text-white text-xs font-semibold rounded shadow-lg">
                        ⚠ Caption hiányos
                      </div>
                    )}
                    
                    {/* Scheduled Time Status */}
                    {post.scheduledTime ? (
                      <div className="px-2 py-1 bg-emerald-500 text-white text-xs font-semibold rounded shadow-lg">
                        ✓ Időzítve
                      </div>
                    ) : (
                      <div className="px-2 py-1 bg-orange-500 text-white text-xs font-semibold rounded shadow-lg">
                        ⚠ Időzítés szükséges
                      </div>
                    )}
                    
                    {/* Notes Indicator */}
                    {post.notes && (
                      <div className="px-2 py-1 bg-amber-500 text-white text-xs font-semibold rounded shadow-lg">
                        💭 Van megjegyzés
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </main>

        {/* Edit Modal */}
        <EditPostModal
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setEditingPost(null);
          }}
          image={editingPostData?.image}
          caption={editingPostData?.caption}
          scheduledTime={editingPostData?.scheduledTime}
          notes={editingPostData?.notes}
          onSave={handleSavePost}
          viewingSharedFeed={!!viewingSharedFeed}
        />

        {/* Share Feed Modal */}
        <ShareFeedModal
          isOpen={shareModalOpen}
          onClose={() => setShareModalOpen(false)}
          currentFeed={1}
          onShare={handleShareFeed}
          accessToken={accessToken || ''}
          serverUrl={serverUrl}
        />

        {/* Shared Feeds Modal */}
        <SharedFeedsModal
          isOpen={sharedFeedsModalOpen}
          onClose={() => setSharedFeedsModalOpen(false)}
          accessToken={accessToken || ''}
          serverUrl={serverUrl}
          onViewFeed={handleViewSharedFeed}
        />

        {/* Feed Preview Modal */}
        <FeedPreviewModal
          isOpen={previewModalOpen}
          onClose={() => setPreviewModalOpen(false)}
          posts={posts}
        />

        {/* Notes Modal */}
        <NotesModal
          isOpen={notesModalOpen}
          onClose={() => {
            setNotesModalOpen(false);
            setEditingNotesPostId(null);
          }}
          notes={editingNotesPostData?.notes}
          postId={editingNotesPostId || 0}
          onSave={handleSaveNotes}
          image={editingNotesPostData?.image}
        />
      </div>
    </DndProvider>
  );
}

export default App;