import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useAuthContext } from '../../context/AuthContext';
import { usePosts } from '../../hooks/usePosts';
import { supabase } from '../../lib/supabase/client';
import { getImageUrl } from '../../lib/supabase/storage';
import { EditPostModal } from '../components/EditPostModal';
import { FeedPreviewModal } from '../components/FeedPreviewModal';
import { ShareFeedModal } from '../components/ShareFeedModal';
import { PostGridSkeleton } from '../components/Skeleton';
import { Instagram, Upload, Trash2, PlusCircle, Eye, X, ArrowLeft, Share2 } from 'lucide-react';
import { toast } from 'sonner';

function FeedEditorPage() {
  const { id: feedId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const { posts, loading, createPost, updatePost, deletePost, reorderPosts } = usePosts(feedId);

  const [editingPost, setEditingPost] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [draggedPostId, setDraggedPostId] = useState<string | null>(null);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [hoverProgress, setHoverProgress] = useState<{ [key: string]: number }>({});
  const [hoveredPostId, setHoveredPostId] = useState<string | null>(null);
  const [postThumbnails, setPostThumbnails] = useState<{ [postId: string]: string }>({});
  const [feedName, setFeedName] = useState<string>('');

  const hoverTimers = useRef<{ [key: string]: NodeJS.Timeout }>({});

  // Load feed name
  useEffect(() => {
    const loadFeedName = async () => {
      if (!feedId) return;

      try {
        const { data, error } = await supabase
          .from('feeds')
          .select('name')
          .eq('id', feedId)
          .single();

        if (!error && data) {
          setFeedName(data.name);
        }
      } catch (err) {
        console.error('Error loading feed name:', err);
      }
    };

    loadFeedName();
  }, [feedId]);

  // Load first image thumbnail for each post
  useEffect(() => {
    const loadThumbnails = async () => {
      if (!posts || posts.length === 0) return;

      const thumbnails: { [postId: string]: string } = {};

      for (const post of posts) {
        try {
          // Get first image for this post
          const { data, error } = await supabase
            .from('post_images')
            .select('storage_path')
            .eq('post_id', post.id)
            .order('position', { ascending: true })
            .limit(1)
            .single();

          if (!error && data) {
            const url = await getImageUrl(data.storage_path);
            thumbnails[post.id] = url;
          }
        } catch (err) {
          // Skip posts without images
          console.log(`No image for post ${post.id}`);
        }
      }

      setPostThumbnails(thumbnails);
    };

    loadThumbnails();
  }, [posts]);

  const handleCreateEmptyPost = async () => {
    try {
      const newPosition = posts.length;
      await createPost(newPosition);
      toast.success('Új poszt létrehozva!');
    } catch (error: any) {
      console.error('Error creating post:', error);
      toast.error('Hiba történt a poszt létrehozásakor');
    }
  };

  const handleMouseEnter = useCallback((id: string) => {
    const post = posts.find((p) => p.id === id);
    if (!post) return;

    setHoveredPostId(id);

    // Start progress animation
    let progress = 0;
    const interval = setInterval(() => {
      progress += 3.33;
      setHoverProgress((prev) => ({ ...prev, [id]: Math.min(progress, 100) }));

      if (progress >= 100) {
        clearInterval(interval);
        // Open modal when progress reaches 100%
        handleEditPost(id);
        // Reset progress
        setHoverProgress((prev) => {
          const newProgress = { ...prev };
          delete newProgress[id];
          return newProgress;
        });
      }
    }, 100);

    hoverTimers.current[id] = interval;
  }, [posts]);

  const handleMouseLeave = useCallback((id: string) => {
    setHoveredPostId(null);

    // Clear timer and reset progress
    if (hoverTimers.current[id]) {
      clearInterval(hoverTimers.current[id]);
      delete hoverTimers.current[id];
    }
    setHoverProgress((prev) => {
      const newProgress = { ...prev };
      delete newProgress[id];
      return newProgress;
    });
  }, []);

  const handleSwapPosts = useCallback(async (dragId: string, dropId: string) => {
    console.log(`🔄 Swapping posts: ${dragId} <-> ${dropId}`);

    const dragPost = posts.find((p) => p.id === dragId);
    const dropPost = posts.find((p) => p.id === dropId);

    if (!dragPost || !dropPost) return;

    try {
      // Swap positions in the array
      const reordered = [...posts];
      const dragIndex = reordered.findIndex((p) => p.id === dragId);
      const dropIndex = reordered.findIndex((p) => p.id === dropId);

      [reordered[dragIndex], reordered[dropIndex]] = [reordered[dropIndex], reordered[dragIndex]];

      // Update positions
      const updatedPosts = reordered.map((post, index) => ({
        ...post,
        position: index,
      }));

      await reorderPosts(updatedPosts);
      toast.success('Posztok felcserélve!');
    } catch (error: any) {
      console.error('Error swapping posts:', error);
      toast.error('Hiba történt a csere során');
    }
  }, [posts, reorderPosts]);

  const handleEditPost = (id: string) => {
    setEditingPost(id);
    setModalOpen(true);
  };

  const handleDeletePost = async (id: string) => {
    if (!window.confirm('Biztosan törölni szeretnéd ezt a posztot?')) return;

    try {
      await deletePost(id);
      toast.success('Poszt törölve!');
    } catch (error: any) {
      console.error('Error deleting post:', error);
      toast.error('Hiba történt a törlés során');
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('Biztosan törölni szeretnéd az összes posztot?')) return;

    try {
      for (const post of posts) {
        await deletePost(post.id);
      }
      toast.success('Minden poszt törölve!');
    } catch (error: any) {
      console.error('Error clearing all posts:', error);
      toast.error('Hiba történt a törlés során');
    }
  };

  const editingPostData = posts.find((p) => p.id === editingPost);
  const filledCount = posts.length;

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="min-h-screen bg-stone-50">
        {/* Header */}
        <header className="bg-white border-b border-stone-200 sticky top-0 z-40 shadow-sm">
          <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4 lg:px-8">
            <div className="flex items-center justify-between gap-2">
              {/* Logo & Title */}
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                <button
                  onClick={() => navigate('/feeds')}
                  className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
                  title="Vissza a feedekhez"
                >
                  <ArrowLeft className="w-5 h-5 text-stone-700" />
                </button>
                <div className="bg-stone-800 p-2 sm:p-2.5 rounded-lg flex-shrink-0">
                  <Instagram className="w-5 h-5 sm:w-6 sm:h-6 text-stone-100" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-stone-900 truncate">
                    Feed Szerkesztő
                  </h1>
                  <p className="text-xs sm:text-sm text-stone-600 hidden sm:block">
                    Tervezd meg a következő posztjaidat
                  </p>
                </div>
              </div>

              {/* Right Side Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Post Counter */}
                <div className="hidden md:flex items-center gap-2 px-3 py-2 bg-stone-100 rounded-lg">
                  <span className="text-sm text-stone-700">
                    {filledCount} poszt
                  </span>
                </div>

                {/* Share Button */}
                <button
                  onClick={() => setShareModalOpen(true)}
                  className="px-3 sm:px-4 py-2 bg-blue-500 text-white hover:bg-blue-600 rounded-lg transition-colors flex items-center gap-2"
                  title="Feed megosztása"
                >
                  <Share2 className="w-4 h-4" />
                  <span className="hidden lg:inline">Megosztás</span>
                </button>

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
                <strong>1.</strong> Kattints egy poszthoz képek hozzáadásához (több kép is lehetséges!)
              </li>
              <li>
                <strong>2.</strong> Tartsd az egeret egy poszt felett <strong>3 másodpercig</strong> a
                caption és időzítés szerkesztéséhez
              </li>
              <li>
                <strong>3.</strong> Húzd a posztokat egymásra a sorrend megváltoztatásához
              </li>
            </ul>
          </div>

          {/* Add Post & Preview Buttons */}
          <div className="mb-4 flex justify-center gap-3">
            <button
              onClick={handleCreateEmptyPost}
              className="px-6 py-3 bg-white border-2 border-dashed border-stone-300 hover:border-stone-500 hover:bg-stone-50 rounded-lg transition-all shadow-sm hover:shadow-md flex items-center gap-3 group"
            >
              <PlusCircle className="w-5 h-5 text-stone-400 group-hover:text-stone-700 transition-colors" />
              <span className="font-medium text-stone-600 group-hover:text-stone-900 transition-colors">
                Új poszt hozzáadása
              </span>
            </button>

            {filledCount > 0 && (
              <button
                onClick={() => setPreviewModalOpen(true)}
                className="px-6 py-3 bg-gradient-to-r from-stone-700 to-stone-800 text-white rounded-lg hover:from-stone-800 hover:to-stone-900 transition-all shadow-sm hover:shadow-md flex items-center gap-3 group"
              >
                <Eye className="w-5 h-5" />
                <span className="font-medium">Feed Előnézet</span>
              </button>
            )}
          </div>

          {/* Grid */}
          {loading ? (
            <PostGridSkeleton />
          ) : posts.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-stone-200 rounded-lg">
              <p className="text-stone-600 mb-4">Még nincs egy posztod sem</p>
              <button
                onClick={handleCreateEmptyPost}
                className="text-stone-800 font-semibold hover:underline"
              >
                Hozz létre egyet most!
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-0.5 mb-16">
              {posts.map((post) => (
                <div
                  key={post.id}
                  className="aspect-[4/5] bg-stone-100 rounded-sm overflow-hidden relative group cursor-pointer"
                  draggable={draggedPostId === null}
                  onDragStart={(e) => {
                    setDraggedPostId(post.id);
                    e.dataTransfer.effectAllowed = 'move';
                  }}
                  onDragEnd={() => {
                    setDraggedPostId(null);
                  }}
                  onDragOver={(e) => {
                    if (draggedPostId !== null && draggedPostId !== post.id) {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                    }
                  }}
                  onDrop={async (e) => {
                    e.preventDefault();

                    // Check if we're swapping posts (internal drag)
                    if (draggedPostId !== null && draggedPostId !== post.id) {
                      await handleSwapPosts(draggedPostId, post.id);
                      setDraggedPostId(null);
                      return;
                    }
                  }}
                  onMouseEnter={() => handleMouseEnter(post.id)}
                  onMouseLeave={() => handleMouseLeave(post.id)}
                  onClick={() => handleEditPost(post.id)}
                >
                  {/* Drag indicator overlay */}
                  {draggedPostId !== null && draggedPostId !== post.id && (
                    <div className="absolute inset-0 bg-blue-500 bg-opacity-20 border-2 border-blue-500 border-dashed z-10 pointer-events-none flex items-center justify-center">
                      <div className="bg-white px-3 py-2 rounded-lg shadow-lg">
                        <span className="text-sm font-medium text-blue-700">Cseréld ide</span>
                      </div>
                    </div>
                  )}

                  {/* Currently dragging overlay */}
                  {draggedPostId === post.id && (
                    <div className="absolute inset-0 bg-stone-900 bg-opacity-50 z-20 pointer-events-none flex items-center justify-center">
                      <div className="bg-white px-3 py-2 rounded-lg shadow-lg">
                        <span className="text-sm font-medium text-stone-700">Húzd ide</span>
                      </div>
                    </div>
                  )}

                  {/* Image or placeholder */}
                  {postThumbnails[post.id] ? (
                    <img
                      src={postThumbnails[post.id]}
                      alt={`Post ${post.position + 1}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-stone-400 bg-white">
                      <div className="text-center">
                        <Upload className="w-8 h-8 mx-auto mb-2" />
                        <p className="text-xs">Kattints a szerkesztéshez</p>
                      </div>
                    </div>
                  )}

                  {/* Hover Progress Circle */}
                  {hoverProgress[post.id] && hoverProgress[post.id] > 0 && (
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

                  {/* Delete Post Button - Top Right */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeletePost(post.id);
                    }}
                    className="absolute top-2 right-2 z-20 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-all shadow-lg opacity-0 group-hover:opacity-100 pointer-events-auto"
                    title="Poszt törlése"
                  >
                    <X className="w-4 h-4" />
                  </button>

                  {/* Status Indicators - Bottom Left */}
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
                    {post.scheduled_time ? (
                      <div className="px-2 py-1 bg-emerald-500 text-white text-xs font-semibold rounded shadow-lg">
                        ✓ Időzítve
                      </div>
                    ) : (
                      <div className="px-2 py-1 bg-orange-500 text-white text-xs font-semibold rounded shadow-lg">
                        ⚠ Időzítés szükséges
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>

        {/* Edit Modal */}
        {editingPost && (
          <EditPostModal
            isOpen={modalOpen}
            onClose={() => {
              setModalOpen(false);
              setEditingPost(null);
            }}
            postId={editingPost}
            feedId={feedId!}
            userId={user?.id!}
            caption={editingPostData?.caption || undefined}
            scheduledTime={editingPostData?.scheduled_time || undefined}
            onSave={async (caption: string, scheduledTime: string) => {
              try {
                await updatePost(editingPost, {
                  caption,
                  scheduled_time: scheduledTime ? new Date(scheduledTime) : null,
                });
                toast.success('Poszt mentve!');
              } catch (error: any) {
                console.error('Error saving post:', error);
                toast.error('Hiba történt a mentés során');
              }
            }}
            viewingSharedFeed={false}
          />
        )}

        {/* Feed Preview Modal */}
        <FeedPreviewModal
          isOpen={previewModalOpen}
          onClose={() => setPreviewModalOpen(false)}
          posts={posts.map((p) => ({
            id: p.position,
            caption: p.caption || undefined,
            scheduledTime: p.scheduled_time || undefined,
          }))}
        />

        {/* Share Feed Modal */}
        <ShareFeedModal
          isOpen={shareModalOpen}
          onClose={() => setShareModalOpen(false)}
          feedId={feedId!}
          feedName={feedName}
        />
      </div>
    </DndProvider>
  );
}

export default FeedEditorPage;
