import React, { useState } from 'react';
import { useAuthContext } from '../../context/AuthContext';
import { useFeeds } from '../../hooks/useFeeds';
import { FeedCard } from '../components/FeedCard';
import { FeedCardSkeleton } from '../components/Skeleton';
import { motion } from 'motion/react';
import { Plus, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export const FeedsPage: React.FC = () => {
  const { user, signOut } = useAuthContext();
  const { feeds, loading, createFeed, updateFeed, deleteFeed } = useFeeds(user?.id);
  const [isCreating, setIsCreating] = useState(false);
  const navigate = useNavigate();

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
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-stone-900">
              Instagram Feed Planner
            </h1>
            <p className="text-sm text-stone-600 mt-1">
              {user?.email}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-stone-700 hover:bg-stone-100 rounded-lg transition-colors border border-stone-300 flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Kijelentkezés
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* My Feeds Section */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-stone-900">Saját Feedek</h2>
            <button
              onClick={handleCreateFeed}
              disabled={isCreating}
              className="px-4 py-2 bg-stone-800 text-white rounded-lg hover:bg-stone-900 transition-all shadow-md hover:shadow-lg flex items-center gap-2 disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              Új Feed
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
                Még nincs egy feedned sem
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
            <h2 className="text-xl font-semibold text-stone-900 mb-6">
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
