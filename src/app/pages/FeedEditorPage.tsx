import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useIsMobile } from '../components/ui/use-mobile';
import { useAuthContext } from '../../context/AuthContext';

// PostCard komponens
interface PostCardProps {
  post: {
    id: string;
    position: number;
    caption: string | null;
    scheduled_time: string | null;
  };
  thumbnail?: string;
  isSharedFeed: boolean;
  isMobile: boolean;
  swapMode?: boolean;
  isSelectedForSwap?: boolean;
  selectionOrder?: number;
  gridLabel?: string;
  commentCount?: number;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

const PostCard: React.FC<PostCardProps> = ({
  post,
  thumbnail,
  isSharedFeed,
  isMobile,
  swapMode = false,
  isSelectedForSwap = false,
  selectionOrder,
  gridLabel,
  commentCount = 0,
  onEdit,
  onDelete,
}) => {
  return (
    <div
      className={`aspect-[4/5] bg-stone-100 rounded-sm overflow-hidden relative group cursor-pointer transition-all ${
        swapMode ? 'hover:ring-2 hover:ring-purple-400' : ''
      } ${isSelectedForSwap ? 'ring-4 ring-purple-500 ring-offset-2' : ''}`}
      onClick={() => onEdit(post.id)}
    >
      {/* Grid coordinate label - Top Left */}
      {gridLabel && !isSelectedForSwap && (
        <div className="absolute top-1 left-1 sm:top-2 sm:left-2 z-20 px-1 sm:px-1.5 py-0.5 bg-black bg-opacity-40 text-white text-[9px] sm:text-[10px] font-medium rounded pointer-events-none">
          {gridLabel}
        </div>
      )}

      {/* Selection indicator for swap mode */}
      {isSelectedForSwap && (
        <div className="absolute top-2 left-2 z-30 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold shadow-lg">
          {selectionOrder}
        </div>
      )}

      {/* Image or placeholder */}
      {thumbnail ? (
        <img
          src={thumbnail}
          alt={`Post ${post.position + 1}`}
          className="w-full h-full object-cover"
          draggable={false}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-stone-400 bg-white">
          <div className="text-center p-2">
            <Upload className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-1 sm:mb-2" />
            <p className="text-[10px] sm:text-xs">{isMobile ? 'Koppints' : 'Kattints'}</p>
          </div>
        </div>
      )}

      {/* Delete Post Button - Top Right */}
      {!isSharedFeed && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(post.id);
          }}
          className="absolute top-1 sm:top-2 right-1 sm:right-2 z-20 p-1.5 sm:p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-all shadow-lg sm:opacity-0 sm:group-hover:opacity-100 pointer-events-auto"
          title="Poszt törlése"
        >
          <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>
      )}

      {/* Status Indicators - Bottom Left */}
      <div className="absolute bottom-1 sm:bottom-2 left-1 sm:left-2 flex flex-col gap-0.5 sm:gap-1 z-20 pointer-events-none">
        {/* Caption Status */}
        {post.caption ? (
          <div className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-emerald-500 text-white text-[10px] sm:text-xs font-semibold rounded shadow-lg">
            <span className="hidden sm:inline">✓ Caption beállítva</span>
            <span className="sm:hidden">✓ Caption</span>
          </div>
        ) : (
          <div className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-red-500 text-white text-[10px] sm:text-xs font-semibold rounded shadow-lg">
            <span className="hidden sm:inline">⚠ Caption hiányos</span>
            <span className="sm:hidden">⚠ Caption</span>
          </div>
        )}

        {/* Scheduled Time Status */}
        {post.scheduled_time ? (
          <div className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-emerald-500 text-white text-[10px] sm:text-xs font-semibold rounded shadow-lg">
            <span className="hidden sm:inline">✓ Időzítve</span>
            <span className="sm:hidden">✓ Időzítés</span>
          </div>
        ) : (
          <div className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-orange-500 text-white text-[10px] sm:text-xs font-semibold rounded shadow-lg">
            <span className="hidden sm:inline">⚠ Időzítés szükséges</span>
            <span className="sm:hidden">⚠ Időzítés</span>
          </div>
        )}

        {/* Comment Status */}
        {commentCount > 0 && (
          <div className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-blue-500 text-white text-[10px] sm:text-xs font-semibold rounded shadow-lg">
            <span className="hidden sm:inline">💬 {commentCount} komment</span>
            <span className="sm:hidden">💬 {commentCount}</span>
          </div>
        )}
      </div>
    </div>
  );
};
import { usePosts } from '../../hooks/usePosts';
import { supabase } from '../../lib/supabase/client';
import { getImageUrl } from '../../lib/supabase/storage';
import { EditPostModal } from '../components/EditPostModal';
import { FeedPreviewModal } from '../components/FeedPreviewModal';
import { ShareFeedModal } from '../components/ShareFeedModal';
import { PostGridSkeleton } from '../components/Skeleton';
import { Instagram, Upload, Trash2, Eye, X, ArrowLeft, Share2, ArrowLeftRight, ArrowUp, ArrowDown } from 'lucide-react';
import { toast } from 'sonner';

function FeedEditorPage() {
  const { id: feedId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const { posts, loading, createPost, updatePost, deletePost, swapPosts } = usePosts(feedId);
  const isMobile = useIsMobile();

  const [editingPost, setEditingPost] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [postThumbnails, setPostThumbnails] = useState<{ [postId: string]: string }>({});
  const [postCommentCounts, setPostCommentCounts] = useState<{ [postId: string]: number }>({});
  const [feedName, setFeedName] = useState<string>('');
  const [isSharedFeed, setIsSharedFeed] = useState(false);
  const [swapMode, setSwapMode] = useState(false);
  const [selectedForSwap, setSelectedForSwap] = useState<string[]>([]);

  // Load feed name and check if shared
  useEffect(() => {
    const loadFeedName = async () => {
      if (!feedId) return;

      try {
        const { data, error } = await supabase
          .from('feeds')
          .select('name, owner_id')
          .eq('id', feedId)
          .single();

        if (!error && data) {
          setFeedName(data.name);
          setIsSharedFeed(data.owner_id !== user?.id);
        }
      } catch (err) {
        console.error('Error loading feed name:', err);
      }
    };

    loadFeedName();
  }, [feedId, user?.id]);

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

  // Load comment counts for each post
  useEffect(() => {
    const loadCommentCounts = async () => {
      if (!posts || posts.length === 0) return;

      const postIds = posts.map(p => p.id);

      try {
        const { data, error } = await supabase
          .from('comments')
          .select('post_id')
          .in('post_id', postIds);

        if (error) throw error;

        // Count comments per post
        const counts: { [postId: string]: number } = {};
        (data || []).forEach((comment: { post_id: string }) => {
          counts[comment.post_id] = (counts[comment.post_id] || 0) + 1;
        });

        setPostCommentCounts(counts);
      } catch (err) {
        console.error('Error loading comment counts:', err);
      }
    };

    loadCommentCounts();
  }, [posts]);

  const handleCreatePostAtTop = async () => {
    try {
      // Find the smallest position and create new post with smaller position
      const minPosition = posts.length > 0
        ? Math.min(...posts.map(p => p.position))
        : 0;

      await createPost(minPosition - 1);
      toast.success('Új poszt létrehozva az elején!');
    } catch (error: any) {
      console.error('Error creating post:', error);
      toast.error('Hiba történt a poszt létrehozásakor');
    }
  };

  const handleCreatePostAtBottom = async () => {
    try {
      // Find the largest position and create new post with larger position
      const maxPosition = posts.length > 0
        ? Math.max(...posts.map(p => p.position))
        : -1;

      await createPost(maxPosition + 1);
      toast.success('Új poszt létrehozva a végén!');
    } catch (error: any) {
      console.error('Error creating post:', error);
      toast.error('Hiba történt a poszt létrehozásakor');
    }
  };

  const handleEditPost = (id: string) => {
    if (swapMode) {
      // Csere módban: kijelölés kezelése
      handleSelectForSwap(id);
      return;
    }
    setEditingPost(id);
    setModalOpen(true);
  };

  const handleSelectForSwap = async (postId: string) => {
    if (selectedForSwap.includes(postId)) {
      // Ha már ki van jelölve, töröljük
      setSelectedForSwap((prev) => prev.filter((id) => id !== postId));
    } else if (selectedForSwap.length < 2) {
      const newSelection = [...selectedForSwap, postId];
      setSelectedForSwap(newSelection);

      // Ha 2 poszt ki van jelölve, cseréljük őket
      if (newSelection.length === 2) {
        try {
          await swapPosts(newSelection[0], newSelection[1]);
          toast.success('Posztok felcserélve!');
        } catch (error: any) {
          console.error('Error swapping posts:', error);
          toast.error('Hiba történt a csere során');
        }
        // Kijelölések törlése, de maradunk csere módban
        setSelectedForSwap([]);
      }
    }
  };

  const toggleSwapMode = () => {
    setSwapMode((prev) => !prev);
    setSelectedForSwap([]);
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
                {!isSharedFeed && (
                  <button
                    onClick={() => setShareModalOpen(true)}
                    className="px-3 sm:px-4 py-2 bg-blue-500 text-white hover:bg-blue-600 rounded-lg transition-colors flex items-center gap-2"
                    title="Feed megosztása"
                  >
                    <Share2 className="w-4 h-4" />
                    <span className="hidden lg:inline">Megosztás</span>
                  </button>
                )}

                {/* Shared Feed Badge */}
                {isSharedFeed && (
                  <div className="px-3 sm:px-4 py-2 bg-amber-100 text-amber-800 rounded-lg flex items-center gap-2 text-sm font-medium">
                    <Eye className="w-4 h-4" />
                    <span className="hidden lg:inline">Megosztott feed</span>
                  </div>
                )}

                {/* Clear All Button */}
                {!isSharedFeed && filledCount > 0 && (
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
        <main className="max-w-7xl mx-auto px-3 py-4 sm:px-6 sm:py-8 lg:px-8">
          {/* Instructions */}
          <div className="mb-4 sm:mb-8 p-4 sm:p-6 bg-white rounded-lg border border-stone-200 shadow-sm">
            <h2 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3 text-stone-900">
              {isSharedFeed ? '👁 Megosztott Feed' : '🎯 Használati útmutató'}
            </h2>
            {isSharedFeed ? (
              <p className="text-sm sm:text-base text-stone-700">
                Ez a feed meg lett veled osztva. Megtekintheted a posztokat és kommenteket írhatsz, de nem szerkesztheted őket.
              </p>
            ) : (
              <ul className="space-y-1.5 sm:space-y-2 text-sm sm:text-base text-stone-700">
                <li>
                  <strong>1.</strong> {isMobile ? 'Koppints' : 'Kattints'} egy posztra képek hozzáadásához
                </li>
                <li>
                  <strong>2.</strong> Add meg a leírást és az időzítést
                </li>
                <li>
                  <strong>3.</strong> A „Posztok cseréje" gombbal felcserélheted két poszt helyét
                </li>
              </ul>
            )}
          </div>

          {/* Swap Mode Banner */}
          {swapMode && (
            <div className="mb-4 p-4 bg-purple-50 border border-purple-200 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ArrowLeftRight className="w-5 h-5 text-purple-600" />
                <div>
                  <p className="font-medium text-purple-900">Csere mód aktív</p>
                  <p className="text-sm text-purple-700">
                    {selectedForSwap.length === 0
                      ? 'Válaszd ki az első posztot'
                      : selectedForSwap.length === 1
                      ? 'Válaszd ki a második posztot'
                      : 'Csere folyamatban...'}
                  </p>
                </div>
              </div>
              <button
                onClick={toggleSwapMode}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                Mégse
              </button>
            </div>
          )}

          {/* Add Post & Preview Buttons */}
          <div className="mb-4 flex flex-col sm:flex-row justify-center gap-2 sm:gap-3 flex-wrap">
            {!isSharedFeed && !swapMode && (
              <button
                onClick={handleCreatePostAtTop}
                className="px-4 sm:px-6 py-3 bg-white border-2 border-dashed border-stone-300 hover:border-stone-500 hover:bg-stone-50 rounded-lg transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2 sm:gap-3 group min-h-[48px]"
              >
                <ArrowUp className="w-5 h-5 text-stone-400 group-hover:text-stone-700 transition-colors" />
                <span className="font-medium text-stone-600 group-hover:text-stone-900 transition-colors text-sm sm:text-base">
                  Új poszt felülre
                </span>
              </button>
            )}

            {!isSharedFeed && !swapMode && (
              <button
                onClick={handleCreatePostAtBottom}
                className="px-4 sm:px-6 py-3 bg-white border-2 border-dashed border-stone-300 hover:border-stone-500 hover:bg-stone-50 rounded-lg transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2 sm:gap-3 group min-h-[48px]"
              >
                <ArrowDown className="w-5 h-5 text-stone-400 group-hover:text-stone-700 transition-colors" />
                <span className="font-medium text-stone-600 group-hover:text-stone-900 transition-colors text-sm sm:text-base">
                  Új poszt alulra
                </span>
              </button>
            )}

            {!isSharedFeed && filledCount >= 2 && !swapMode && (
              <button
                onClick={toggleSwapMode}
                className="px-4 sm:px-6 py-3 bg-purple-100 border-2 border-purple-300 hover:border-purple-500 hover:bg-purple-50 rounded-lg transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2 sm:gap-3 group min-h-[48px]"
              >
                <ArrowLeftRight className="w-5 h-5 text-purple-500 group-hover:text-purple-700 transition-colors" />
                <span className="font-medium text-purple-600 group-hover:text-purple-900 transition-colors text-sm sm:text-base">
                  Posztok cseréje
                </span>
              </button>
            )}

            {filledCount > 0 && !swapMode && (
              <button
                onClick={() => setPreviewModalOpen(true)}
                className="px-4 sm:px-6 py-3 bg-gradient-to-r from-stone-700 to-stone-800 text-white rounded-lg hover:from-stone-800 hover:to-stone-900 transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2 sm:gap-3 group min-h-[48px]"
              >
                <Eye className="w-5 h-5" />
                <span className="font-medium text-sm sm:text-base">Feed Előnézet</span>
              </button>
            )}
          </div>

          {/* Grid */}
          {loading ? (
            <PostGridSkeleton />
          ) : posts.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-stone-200 rounded-lg">
              <p className="text-stone-600 mb-4">
                {isSharedFeed ? 'Ez a feed még üres' : 'Még nincs egy posztod sem'}
              </p>
              {!isSharedFeed && (
                <button
                  onClick={handleCreatePostAtTop}
                  className="text-stone-800 font-semibold hover:underline"
                >
                  Hozz létre egyet most!
                </button>
              )}
            </div>
          ) : (
            <div className="mb-16">
              {/* Column headers (A, B, C) */}
              <div className="flex">
                <div className="w-8 sm:w-10 flex-shrink-0" /> {/* Spacer for row numbers */}
                <div className="flex-1 grid grid-cols-3 gap-0.5 mb-1">
                  {['A', 'B', 'C'].map((col) => (
                    <div key={col} className="text-center text-sm sm:text-base font-semibold text-stone-500">
                      {col}
                    </div>
                  ))}
                </div>
              </div>

              {/* Grid with row numbers */}
              {Array.from({ length: Math.ceil(posts.length / 3) }).map((_, rowIndex) => (
                <div key={rowIndex} className="flex">
                  {/* Row number */}
                  <div className="w-8 sm:w-10 flex-shrink-0 flex items-center justify-center text-sm sm:text-base font-semibold text-stone-500">
                    {rowIndex + 1}
                  </div>
                  {/* Posts in this row */}
                  <div className="flex-1 grid grid-cols-3 gap-0.5 mb-0.5">
                    {posts.slice(rowIndex * 3, rowIndex * 3 + 3).map((post, colIndex) => (
                      <PostCard
                        key={post.id}
                        post={post}
                        thumbnail={postThumbnails[post.id]}
                        isSharedFeed={isSharedFeed}
                        isMobile={isMobile}
                        swapMode={swapMode}
                        isSelectedForSwap={selectedForSwap.includes(post.id)}
                        selectionOrder={selectedForSwap.indexOf(post.id) + 1 || undefined}
                        onEdit={handleEditPost}
                        onDelete={handleDeletePost}
                        gridLabel={`${['A', 'B', 'C'][colIndex]}${rowIndex + 1}`}
                        commentCount={postCommentCounts[post.id] || 0}
                      />
                    ))}
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
            viewingSharedFeed={isSharedFeed}
          />
        )}

        {/* Feed Preview Modal */}
        <FeedPreviewModal
          isOpen={previewModalOpen}
          onClose={() => setPreviewModalOpen(false)}
          posts={posts.map((p) => ({
            id: p.position,
            image: postThumbnails[p.id],
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
  );
}

export default FeedEditorPage;
