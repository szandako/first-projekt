import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, UserPlus, Mail } from 'lucide-react';
import { useFeedShares } from '../../hooks/useFeedShares';
import { SharedUsersList } from './SharedUsersList';
import { toast } from 'sonner';

interface ShareFeedModalProps {
  isOpen: boolean;
  onClose: () => void;
  feedId: string;
  feedName: string;
}

export const ShareFeedModal: React.FC<ShareFeedModalProps> = ({
  isOpen,
  onClose,
  feedId,
  feedName,
}) => {
  const { shares, loading, shareFeed, removeShare } = useFeedShares(feedId);
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    try {
      setSubmitting(true);
      await shareFeed(email);
      toast.success(`Feed megosztva ${email} felhasználóval!`);
      setEmail('');
    } catch (error: any) {
      console.error('Error sharing feed:', error);
      toast.error(error.message || 'Hiba történt a megosztás során');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveShare = async (shareId: string, sharedWithEmail: string) => {
    if (!window.confirm(`Biztosan visszavonod a megosztást ${sharedWithEmail} felhasználóval?`)) {
      return;
    }

    try {
      await removeShare(shareId);
      toast.success('Megosztás visszavonva!');
    } catch (error: any) {
      console.error('Error removing share:', error);
      toast.error('Hiba történt a megosztás visszavonásakor');
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleBackdropClick}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden border border-stone-200"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-stone-200 bg-stone-50">
              <div className="min-w-0 flex-1">
                <h2 className="text-lg sm:text-2xl font-semibold text-stone-900 truncate">Feed Megosztása</h2>
                <p className="text-xs sm:text-sm text-stone-600 mt-0.5 sm:mt-1 truncate">{feedName}</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-stone-200 rounded-lg transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center flex-shrink-0 ml-2"
              >
                <X className="w-5 h-5 text-stone-700" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(95vh-200px)] sm:max-h-[calc(90vh-200px)]">
              {/* Share Form */}
              <div className="mb-6">
                <label className="flex items-center gap-2 text-sm font-medium text-stone-700 mb-2 sm:mb-3">
                  <UserPlus className="w-4 h-4" />
                  Új felhasználó hozzáadása
                </label>
                <form onSubmit={handleShare} className="flex flex-col sm:flex-row gap-2">
                  <div className="flex-1 relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="pelda@email.com"
                      className="w-full pl-10 pr-4 py-3 border-2 border-stone-200 rounded-lg focus:border-stone-600 focus:ring-2 focus:ring-stone-200 outline-none transition-all text-base min-h-[48px]"
                      disabled={submitting}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!email.trim() || submitting}
                    className="px-4 sm:px-6 py-3 bg-stone-800 text-white rounded-lg hover:bg-stone-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium min-h-[48px] text-sm sm:text-base"
                  >
                    {submitting ? 'Megosztás...' : 'Megosztás'}
                  </button>
                </form>
                <p className="text-xs text-stone-500 mt-2">
                  A felhasználó csak olvasási joggal fog rendelkezni, de kommenteket tud írni.
                </p>
              </div>

              {/* Shared Users List */}
              <div>
                <h3 className="text-sm font-medium text-stone-700 mb-3">
                  Megosztva ({shares.length})
                </h3>
                {loading ? (
                  <div className="text-center py-8 text-stone-500">Betöltés...</div>
                ) : shares.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed border-stone-200 rounded-lg">
                    <UserPlus className="w-12 h-12 mx-auto mb-3 text-stone-300" />
                    <p className="text-stone-500 text-sm">Még nincs megosztva senkivel</p>
                    <p className="text-stone-400 text-xs mt-1">
                      Add meg egy felhasználó email címét a megosztáshoz
                    </p>
                  </div>
                ) : (
                  <SharedUsersList shares={shares} onRemoveShare={handleRemoveShare} />
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-4 sm:p-6 border-t border-stone-200 bg-stone-50">
              <button
                onClick={onClose}
                className="px-4 sm:px-6 py-2.5 bg-stone-800 text-white rounded-lg hover:bg-stone-900 transition-all font-medium min-h-[44px] text-sm sm:text-base"
              >
                Bezárás
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
