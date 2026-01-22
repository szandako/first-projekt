import React, { useEffect, useState } from 'react';
import { X, Users, Loader2, Eye } from 'lucide-react';

interface SharedFeed {
  ownerId: string;
  ownerEmail: string;
  feedNumber: string;
  sharedAt: string;
}

interface SharedFeedsModalProps {
  isOpen: boolean;
  onClose: () => void;
  accessToken: string;
  serverUrl: string;
  onViewFeed: (ownerId: string, feedNumber: string, ownerEmail: string) => void;
}

export function SharedFeedsModal({ isOpen, onClose, accessToken, serverUrl, onViewFeed }: SharedFeedsModalProps) {
  const [sharedFeeds, setSharedFeeds] = useState<SharedFeed[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadSharedFeeds();
    }
  }, [isOpen]);

  const loadSharedFeeds = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${serverUrl}/feeds/shared-with-me`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error('Nem sikerült betölteni a megosztott feedeket');
      }

      const data = await response.json();
      setSharedFeeds(data.feeds || []);
    } catch (err: any) {
      setError(err.message || 'Hiba történt a betöltés során');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-stone-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-stone-800 p-3 rounded-lg">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-stone-900">
                  Megosztott Feedek
                </h2>
                <p className="text-sm text-stone-600">
                  Feedek, amiket mások megosztottak veled
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-stone-600" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-stone-700 mb-3" />
              <p className="text-stone-600">Betöltés...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          ) : sharedFeeds.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-stone-300 mx-auto mb-4" />
              <p className="text-stone-600 font-medium mb-2">
                Nincs megosztott feed
              </p>
              <p className="text-sm text-stone-500">
                Amikor valaki megoszt veled egy feedet, itt fog megjelenni.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {sharedFeeds.map((feed, index) => (
                <div
                  key={index}
                  className="p-4 border border-stone-200 rounded-lg hover:border-stone-400 transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-stone-900">
                          Feed {feed.feedNumber}
                        </h3>
                        <span className="text-xs px-2 py-1 bg-stone-100 text-stone-600 rounded">
                          Megosztva
                        </span>
                      </div>
                      <p className="text-sm text-stone-600">
                        {feed.ownerEmail}
                      </p>
                      <p className="text-xs text-stone-400 mt-1">
                        Megosztva: {new Date(feed.sharedAt).toLocaleDateString('hu-HU')}
                      </p>
                    </div>
                    <button
                      onClick={() => onViewFeed(feed.ownerId, feed.feedNumber, feed.ownerEmail)}
                      className="px-4 py-2 bg-stone-800 text-white rounded-lg hover:bg-stone-900 transition-all flex items-center gap-2 opacity-0 group-hover:opacity-100"
                    >
                      <Eye className="w-4 h-4" />
                      Megtekintés
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-stone-200">
          <button
            onClick={onClose}
            className="w-full px-4 py-3 bg-stone-100 text-stone-700 rounded-lg hover:bg-stone-200 transition-colors font-medium"
          >
            Bezárás
          </button>
        </div>
      </div>
    </div>
  );
}