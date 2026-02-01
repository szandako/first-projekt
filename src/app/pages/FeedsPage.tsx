import React, { useState, useEffect, useRef } from 'react';
import { useAuthContext } from '../../context/AuthContext';
import { useFeeds } from '../../hooks/useFeeds';
import { useStorageUsage } from '../../hooks/useStorageUsage';
import { FeedCard } from '../components/FeedCard';
import { FeedCardSkeleton } from '../components/Skeleton';
import { motion } from 'motion/react';
import { Plus, LogOut, AlertTriangle, HardDrive } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export const FeedsPage: React.FC = () => {
  const { user, signOut } = useAuthContext();
  const { feeds, loading, createFeed, updateFeed, deleteFeed } = useFeeds(user?.id);
  const { usage, loading: storageLoading } = useStorageUsage(user?.id);
  const [isCreating, setIsCreating] = useState(false);
  const navigate = useNavigate();
  const hasShownStorageWarning = useRef(false);

  // Show storage warning toast once when near limit
  useEffect(() => {
    if (usage?.isNearLimit && !hasShownStorageWarning.current) {
      hasShownStorageWarning.current = true;
      toast.warning(
        `Figyelem! A tárhelyed ${usage.usedPercentage.toFixed(1)}%-ban betelt (${usage.formattedUsed} / ${usage.formattedLimit})`,
        {
          duration: 10000,
          icon: '⚠️',
        }
      );
    }
  }, [usage]);

  const handleCreateFeed = async () => {
    const name = window.prompt('Feed neve:');
    if (!name || !name.trim()) return;

    const description = window.prompt('Leírás (opcionális):');

    try {
      setIsCreating(true);
      await createFeed(name.trim(), description?.trim() || undefined);
      toast.success('Feed létrehozva!');
    } catch (error: any) {
      console.error('Create feed error:', error);
      toast.error('Hiba történt a feed létrehozásakor');
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateFeed = async (
    id: string,
    name: string,
    description: string | null
  ) => {
    try {
      await updateFeed(id, { name, description: description || undefined });
      toast.success('Feed átnevezve!');
    } catch (error: any) {
      console.error('Update feed error:', error);
      toast.error('Hiba történt az átnevezéskor');
    }
  };

  const handleDeleteFeed = async (id: string) => {
    try {
      await deleteFeed(id);
      toast.success('Feed törölve!');
    } catch (error: any) {
      console.error('Delete feed error:', error);
      toast.error('Hiba történt a törléskor');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login');
      toast.success('Sikeresen kijelentkeztél');
    } catch (error: any) {
      console.error('Logout error:', error);
      toast.error('Hiba történt a kijelentkezéskor');
    }
  };

  const ownedFeeds = feeds.filter((f) => f.owner_id === user?.id);
  const sharedFeeds = feeds.filter((f) => f.owner_id !== user?.id);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b-2 border-stone-200 bg-white sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-lg sm:text-2xl font-bold text-stone-900 truncate">
              Instagram Feed Planner
            </h1>
            <p className="text-xs sm:text-sm text-stone-600 mt-0.5 sm:mt-1 truncate max-w-[200px] sm:max-w-none">
              {user?.email}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="px-3 sm:px-4 py-2 text-stone-700 hover:bg-stone-100 rounded-lg transition-colors border border-stone-300 flex items-center gap-1.5 sm:gap-2 flex-shrink-0 min-h-[40px]"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Kijelentkezés</span>
          </button>
        </div>
      </div>

      {/* Storage Usage Indicator */}
      {!storageLoading && usage && (
        <div className={`border-b ${usage.isNearLimit ? 'bg-amber-50 border-amber-200' : 'bg-stone-50 border-stone-200'}`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2">
            <div className="flex items-center gap-2 sm:gap-3">
              {usage.isNearLimit ? (
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
              ) : (
                <HardDrive className="w-4 h-4 text-stone-500 flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-medium ${usage.isNearLimit ? 'text-amber-800' : 'text-stone-600'}`}>
                    Tárhely: {usage.formattedUsed} / {usage.formattedLimit}
                  </span>
                  <span className={`text-xs font-semibold ${usage.isNearLimit ? 'text-amber-800' : 'text-stone-600'}`}>
                    {usage.usedPercentage.toFixed(1)}%
                  </span>
                </div>
                <div className="h-1.5 bg-stone-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      usage.usedPercentage >= 90
                        ? 'bg-red-500'
                        : usage.isNearLimit
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(usage.usedPercentage, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
        {/* My Feeds Section */}
        <div className="mb-8 sm:mb-12">
          <div className="flex items-center justify-between mb-4 sm:mb-6 gap-3">
            <h2 className="text-lg sm:text-xl font-semibold text-stone-900">Saját Feedek</h2>
            <button
              onClick={handleCreateFeed}
              disabled={isCreating}
              className="px-3 sm:px-4 py-2 bg-stone-800 text-white rounded-lg hover:bg-stone-900 transition-all shadow-md hover:shadow-lg flex items-center gap-1.5 sm:gap-2 disabled:opacity-50 min-h-[40px] text-sm sm:text-base"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Új Feed</span>
              <span className="sm:hidden">Új</span>
            </button>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <FeedCardSkeleton key={i} />
              ))}
            </div>
          ) : ownedFeeds.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-stone-200 rounded-lg">
              <p className="text-stone-600 mb-4">
                Még nincs egy feeded sem
              </p>
              <button
                onClick={handleCreateFeed}
                className="text-stone-800 font-semibold hover:underline"
              >
                Hozz létre egyet most!
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {ownedFeeds.map((feed) => (
                <FeedCard
                  key={feed.id}
                  id={feed.id}
                  name={feed.name}
                  description={feed.description}
                  created_at={feed.created_at}
                  isOwner={true}
                  onDelete={handleDeleteFeed}
                  onEdit={handleUpdateFeed}
                />
              ))}
            </div>
          )}
        </div>

        {/* Shared Feeds Section */}
        {sharedFeeds.length > 0 && (
          <div>
            <h2 className="text-lg sm:text-xl font-semibold text-stone-900 mb-4 sm:mb-6">
              Velem Megosztott Feedek
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sharedFeeds.map((feed) => (
                <FeedCard
                  key={feed.id}
                  id={feed.id}
                  name={feed.name}
                  description={feed.description}
                  created_at={feed.created_at}
                  isOwner={false}
                  onDelete={() => {}}
                  onEdit={() => {}}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
