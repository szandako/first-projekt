import React, { useState, useEffect } from 'react';
import { X, Mail, Share2, Loader2, Trash2, Users } from 'lucide-react';

interface Share {
  ownerId: string;
  ownerEmail: string;
  sharedWithId: string;
  sharedWithEmail: string;
  feedNumber: string;
  sharedAt: string;
}

interface ShareFeedModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentFeed: number;
  onShare: (email: string) => Promise<void>;
  accessToken: string;
  serverUrl: string;
}

export function ShareFeedModal({ isOpen, onClose, currentFeed, onShare, accessToken, serverUrl }: ShareFeedModalProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [shares, setShares] = useState<Share[]>([]);
  const [loadingShares, setLoadingShares] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  // Load existing shares when modal opens
  useEffect(() => {
    if (isOpen) {
      loadShares();
    }
  }, [isOpen]);

  const loadShares = async () => {
    setLoadingShares(true);
    try {
      const response = await fetch(`${serverUrl}/feeds/shares?feedNumber=${currentFeed}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setShares(data.shares || []);
      } else {
        console.error('Failed to load shares');
      }
    } catch (error) {
      console.error('Error loading shares:', error);
    } finally {
      setLoadingShares(false);
    }
  };

  const handleRevoke = async (sharedWithId: string) => {
    if (!window.confirm('Biztosan visszavonod a megosztást?')) {
      return;
    }

    setRevokingId(sharedWithId);
    try {
      const response = await fetch(`${serverUrl}/feeds/share/${sharedWithId}?feedNumber=${currentFeed}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (response.ok) {
        setSuccess('✅ Megosztás visszavonva');
        await loadShares(); // Reload the list
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const error = await response.json();
        setError(error.error || 'Hiba történt a visszavonás során');
      }
    } catch (error: any) {
      setError(error.message || 'Hiba történt a visszavonás során');
    } finally {
      setRevokingId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setError('Kérlek adj meg egy email címet');
      return;
    }

    if (!email.includes('@')) {
      setError('Kérlek adj meg egy érvényes email címet');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await onShare(email.trim());
      setSuccess(`✅ Feed sikeresen megosztva: ${email}`);
      setEmail('');
      await loadShares(); // Reload the list
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Hiba történt a megosztás során');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setEmail('');
    setError('');
    setSuccess('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-stone-200">
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-2 hover:bg-stone-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-stone-600" />
          </button>

          <div className="flex items-center gap-3">
            <div className="bg-stone-800 p-3 rounded-lg">
              <Share2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-stone-900">
                Feed megosztása
              </h2>
              <p className="text-sm text-stone-600">
                Feed {currentFeed}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* Share Form */}
          <form onSubmit={handleSubmit} className="space-y-4 mb-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-stone-700 mb-2">
                Új megosztás hozzáadása
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="pelda@email.com"
                  className="w-full pl-11 pr-4 py-3 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-800 focus:border-transparent"
                  disabled={loading}
                />
              </div>
              <p className="text-xs text-stone-500 mt-2">
                Add meg annak a felhasználónak az email címét, akivel meg szeretnéd osztani ezt a feedet.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full px-4 py-3 bg-stone-800 text-white rounded-lg hover:bg-stone-900 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Megosztás...
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4" />
                  Megosztás
                </>
              )}
            </button>
          </form>

          {/* Error/Success Messages */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-700">{success}</p>
            </div>
          )}

          {/* Existing Shares List */}
          <div className="border-t border-stone-200 pt-6">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-stone-700" />
              <h3 className="font-semibold text-stone-900">
                Megosztva ({shares.length})
              </h3>
            </div>

            {loadingShares ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-stone-400" />
              </div>
            ) : shares.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-stone-300 mx-auto mb-3" />
                <p className="text-stone-500 text-sm">
                  Még nem osztottad meg senkivel ezt a feedet
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {shares.map((share) => (
                  <div
                    key={share.sharedWithId}
                    className="flex items-center justify-between p-4 bg-stone-50 rounded-lg border border-stone-200 hover:bg-stone-100 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="bg-stone-800 p-2 rounded-full">
                        <Mail className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-stone-900 truncate">
                          {share.sharedWithEmail}
                        </p>
                        <p className="text-xs text-stone-500">
                          Megosztva: {new Date(share.sharedAt).toLocaleDateString('hu-HU', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRevoke(share.sharedWithId)}
                      disabled={revokingId === share.sharedWithId}
                      className="ml-3 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                      title="Megosztás visszavonása"
                    >
                      {revokingId === share.sharedWithId ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Trash2 className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-stone-200">
          <button
            onClick={handleClose}
            className="w-full px-4 py-3 border border-stone-300 text-stone-700 rounded-lg hover:bg-stone-50 transition-colors font-medium"
          >
            Bezárás
          </button>
        </div>
      </div>
    </div>
  );
}
