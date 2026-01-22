import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Eye } from 'lucide-react';

interface Post {
  id: number;
  image?: string;
  caption?: string;
  scheduledTime?: string;
}

interface FeedPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  posts: Post[];
}

export const FeedPreviewModal: React.FC<FeedPreviewModalProps> = ({
  isOpen,
  onClose,
  posts
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-stone-800 to-stone-700 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Eye className="w-6 h-6" />
                <h2 className="text-xl font-semibold">Feed Előnézet</h2>
              </div>
              <button
                onClick={onClose}
                className="hover:bg-white/20 p-2 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Preview Grid */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)] bg-stone-50">
              <div className="bg-white rounded-lg shadow-sm border border-stone-200 p-4">
                <div className="grid grid-cols-3 gap-1">
                  {posts.map((post) => (
                    <div
                      key={post.id}
                      className="relative bg-gray-100 overflow-hidden rounded-sm border border-gray-200"
                      style={{ aspectRatio: '4/5' }}
                    >
                      {post.image ? (
                        <div className="w-full h-full relative group">
                          <img
                            src={post.image}
                            alt={`Preview ${post.id}`}
                            className="w-full h-full object-cover"
                          />
                          
                          {/* Mini info badges */}
                          {(post.caption || post.scheduledTime) && (
                            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center p-2">
                              <div className="flex gap-1">
                                {post.caption && (
                                  <div className="bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded">
                                    📝
                                  </div>
                                )}
                                {post.scheduledTime && (
                                  <div className="bg-green-500 text-white text-xs px-1.5 py-0.5 rounded">
                                    ⏰
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                          <div className="text-2xl">📸</div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Info */}
              <div className="mt-4 text-center text-sm text-stone-600">
                <p>
                  Összesen <strong>{posts.filter(p => p.image).length}</strong> kép feltöltve,{' '}
                  <strong>{posts.filter(p => p.caption).length}</strong> caption,{' '}
                  <strong>{posts.filter(p => p.scheduledTime).length}</strong> időzített poszt
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-stone-50 px-6 py-4 border-t border-stone-200 flex justify-end">
              <button
                onClick={onClose}
                className="px-6 py-2 bg-stone-800 text-white rounded-lg hover:bg-stone-700 transition-colors font-medium"
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
