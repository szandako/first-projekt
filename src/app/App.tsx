import React, { useState, useCallback, useRef } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { EditPostModal } from './components/EditPostModal';
import { FeedPreviewModal } from './components/FeedPreviewModal';
import imageCompression from 'browser-image-compression';
import { Instagram, Upload, Trash2, PlusCircle, Eye, X } from 'lucide-react';

interface Post {
  id: number;
  image?: string;
  caption?: string;
  scheduledTime?: string;
}

function App() {
  const [posts, setPosts] = useState<Post[]>(
    Array.from({ length: 9 }, (_, i) => ({ id: i + 1 }))
  );
  const [editingPost, setEditingPost] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [nextId, setNextId] = useState(10);
  const [draggedPost, setDraggedPost] = useState<number | null>(null);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [hoverProgress, setHoverProgress] = useState<{ [key: number]: number }>({});
  const [hoveredPostId, setHoveredPostId] = useState<number | null>(null);

  const hoverTimers = useRef<{ [key: number]: NodeJS.Timeout }>({});

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
        maxSizeMB: 0.5, // Max size 500KB
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

  const handleImageDrop = useCallback(async (id: number, image: string) => {
    const compressedImage = await compressImage(image);
    setPosts((prev) =>
      prev.map((post) => (post.id === id ? { ...post, image: compressedImage } : post))
    );
  }, []);

  const handleImageLoad = useCallback(async (id: number, imageData: string) => {
    const compressedImage = await compressImage(imageData);
    setPosts((prev) =>
      prev.map((post) => (post.id === id ? { ...post, image: compressedImage } : post))
    );
  }, []);

  const handleDragStart = useCallback((id: number) => {
    setDraggedPost(id);
  }, []);

  const handleMouseEnter = useCallback((id: number) => {
    const post = posts.find(p => p.id === id);
    if (!post?.image) return;

    setHoveredPostId(id);

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
  }, [posts]);

  const handleMouseLeave = useCallback((id: number) => {
    setHoveredPostId(null);

    // Clear timer and reset progress
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

      // Swap the content (image, caption, scheduledTime) but keep IDs
      return prev.map(post => {
        if (post.id === dragId) {
          return {
            id: dragId,
            image: dropPost.image,
            caption: dropPost.caption,
            scheduledTime: dropPost.scheduledTime
          };
        }
        if (post.id === dropId) {
          return {
            id: dropId,
            image: dragPost.image,
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

  const handleSavePost = (caption: string, scheduledTime: string) => {
    if (editingPost) {
      setPosts((prev) =>
        prev.map((post) =>
          post.id === editingPost ? { ...post, caption, scheduledTime } : post
        )
      );
    }
  };

  const handleRemoveImage = (id: number) => {
    setPosts((prev) =>
      prev.map((post) =>
        post.id === id
          ? { id: post.id, caption: undefined, scheduledTime: undefined, image: undefined }
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

  const editingPostData = posts.find((p) => p.id === editingPost);
  const filledCount = posts.filter((p) => p.image).length;

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
                    Instagram Feed Planner
                  </h1>
                  <p className="text-xs sm:text-sm text-stone-600 hidden sm:block">
                    Tervezd meg a következő posztjaidat
                  </p>
                </div>
              </div>

              {/* Right Side Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Image Counter */}
                <div className="hidden md:flex items-center gap-2 px-3 py-2 bg-stone-100 rounded-lg">
                  <span className="text-sm text-stone-700">
                    {filledCount} / {posts.length}
                  </span>
                </div>

                {/* Upload Button */}
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

                {/* Clear All Button */}
                {filledCount > 0 && (
                  <button
                    onClick={handleClearAll}
                    className="px-3 sm:px-4 py-2 bg-red-500 text-white hover:bg-red-600 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="hidden lg:inline">Összes törlése</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          {/* Instructions */}
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
                <strong>4.</strong> Húzd a képeket egymásra a sorrend megváltoztatásához
              </li>
            </ul>
          </div>

          {/* Add Cell & Preview Buttons */}
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

          {/* Grid */}
          <div className="grid grid-cols-3 gap-0.5 mb-16">
            {posts.map(post => (
              <div
                key={post.id}
                className="aspect-[4/5] bg-stone-100 rounded-sm overflow-hidden relative group cursor-pointer"
                draggable={!!post.image && draggedPost === null}
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
                        reader.onload = async (event) => {
                          const result = event.target?.result as string;
                          const compressed = await compressImage(result);
                          updatePost(post.id, { image: compressed });
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

                {/* Delete Image Button - Top Right */}
                {post.image && (
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
          viewingSharedFeed={false}
        />

        {/* Feed Preview Modal */}
        <FeedPreviewModal
          isOpen={previewModalOpen}
          onClose={() => setPreviewModalOpen(false)}
          posts={posts}
        />
      </div>
    </DndProvider>
  );
}

export default App;
