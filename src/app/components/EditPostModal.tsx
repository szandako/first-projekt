import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Calendar, Clock, MessageSquare, Upload, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { usePostImages } from '../../hooks/usePostImages';
import { CommentsPanel } from './CommentsPanel';
import { toast } from 'sonner';

interface EditPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  postId: string;
  feedId: string;
  userId: string;
  caption?: string;
  scheduledTime?: string;
  notes?: string;
  onSave: (caption: string, scheduledTime: string) => void;
  viewingSharedFeed: boolean;
}

export const EditPostModal: React.FC<EditPostModalProps> = ({
  isOpen,
  onClose,
  postId,
  feedId,
  userId,
  caption: initialCaption = '',
  scheduledTime: initialScheduledTime = '',
  notes: initialNotes = '',
  onSave,
  viewingSharedFeed,
}) => {
  const { images, loading, addImage, removeImage } = usePostImages(postId);
  const [caption, setCaption] = useState(initialCaption || '');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    setCaption(initialCaption || '');

    if (initialScheduledTime) {
      const date = new Date(initialScheduledTime);
      const dateStr = date.toISOString().split('T')[0];
      const timeStr = date.toTimeString().slice(0, 5);
      setScheduledDate(dateStr);
      setScheduledTime(timeStr);
    } else {
      // Default to current date and time
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const timeStr = now.toTimeString().slice(0, 5);
      setScheduledDate(dateStr);
      setScheduledTime(timeStr);
    }
  }, [initialCaption, initialScheduledTime, isOpen]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setUploading(true);
      const file = files[0];

      if (!file.type.startsWith('image/')) {
        toast.error('Csak képfájlokat tölthetsz fel');
        return;
      }

      const position = images.length;
      await addImage(file, userId, feedId, position);
      toast.success('Kép feltöltve!');
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast.error('Hiba történt a feltöltés során');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDeleteImage = async (imageId: string, storagePath: string) => {
    if (!window.confirm('Biztosan törölni szeretnéd ezt a képet?')) return;

    try {
      await removeImage(imageId, storagePath);
      toast.success('Kép törölve!');
      // Reset carousel index if needed
      if (currentImageIndex >= images.length - 1) {
        setCurrentImageIndex(Math.max(0, images.length - 2));
      }
    } catch (error: any) {
      console.error('Error deleting image:', error);
      toast.error('Hiba történt a törlés során');
    }
  };

  const handleSave = () => {
    const datetime = `${scheduledDate}T${scheduledTime}`;
    onSave(caption, datetime);
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleBackdropClick}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-lg shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden border border-stone-200"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-stone-200">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-semibold text-stone-900">Poszt Részletei</h2>
                {viewingSharedFeed && (
                  <span className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-medium rounded-full border border-amber-200">
                    Csak olvasható
                  </span>
                )}
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-stone-700" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              <div className="grid lg:grid-cols-3 gap-6">
                {/* Image carousel */}
                <div className="space-y-3">
                  <label className="flex items-center justify-between text-sm font-medium text-stone-700">
                    <span>Képek ({images.length})</span>
                    {!viewingSharedFeed && (
                      <label className="cursor-pointer px-3 py-1.5 bg-stone-800 text-white rounded-lg hover:bg-stone-900 transition-all text-xs flex items-center gap-2">
                        <Upload className="w-3.5 h-3.5" />
                        {uploading ? 'Feltöltés...' : 'Kép hozzáadása'}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileUpload}
                          disabled={uploading}
                          className="hidden"
                        />
                      </label>
                    )}
                  </label>

                  {loading ? (
                    <div className="rounded-lg border-2 border-stone-200 flex items-center justify-center" style={{ aspectRatio: '4/5' }}>
                      <p className="text-stone-500">Betöltés...</p>
                    </div>
                  ) : images.length === 0 ? (
                    <div className="rounded-lg border-2 border-dashed border-stone-300 flex items-center justify-center bg-stone-50" style={{ aspectRatio: '4/5' }}>
                      <div className="text-center p-6">
                        <Upload className="w-12 h-12 mx-auto mb-3 text-stone-400" />
                        <p className="text-stone-600 text-sm">
                          {viewingSharedFeed ? 'Nincs feltöltött kép' : 'Nincs feltöltött kép. Kattints a "Kép hozzáadása" gombra!'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="relative">
                      <div className="rounded-lg overflow-hidden border-2 border-stone-200" style={{ aspectRatio: '4/5' }}>
                        <img
                          src={images[currentImageIndex]?.url}
                          alt={`Image ${currentImageIndex + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* Navigation buttons (only if more than 1 image) */}
                      {images.length > 1 && (
                        <>
                          <button
                            onClick={prevImage}
                            className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-white/80 hover:bg-white rounded-full shadow-lg transition-all"
                          >
                            <ChevronLeft className="w-5 h-5 text-stone-700" />
                          </button>
                          <button
                            onClick={nextImage}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-white/80 hover:bg-white rounded-full shadow-lg transition-all"
                          >
                            <ChevronRight className="w-5 h-5 text-stone-700" />
                          </button>

                          {/* Image counter */}
                          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-black/60 text-white text-xs rounded-full">
                            {currentImageIndex + 1} / {images.length}
                          </div>
                        </>
                      )}

                      {/* Delete button */}
                      {!viewingSharedFeed && images[currentImageIndex] && (
                        <button
                          onClick={() => handleDeleteImage(images[currentImageIndex].id, images[currentImageIndex].storage_path)}
                          className="absolute top-3 right-3 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-all shadow-lg"
                          title="Kép törlése"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}

                      {/* Thumbnail dots */}
                      {images.length > 1 && (
                        <div className="flex justify-center gap-2 mt-3">
                          {images.map((_, index) => (
                            <button
                              key={index}
                              onClick={() => setCurrentImageIndex(index)}
                              className={`w-2 h-2 rounded-full transition-all ${
                                index === currentImageIndex
                                  ? 'bg-stone-800 w-6'
                                  : 'bg-stone-300 hover:bg-stone-400'
                              }`}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Form */}
                <div className="space-y-6">
                  {/* Caption */}
                  <div className="space-y-3">
                    <label className="flex items-center gap-2 text-sm font-medium text-stone-700">
                      <MessageSquare className="w-4 h-4" />
                      Caption
                    </label>
                    <textarea
                      value={caption}
                      onChange={(e) => setCaption(e.target.value)}
                      placeholder="Írj egy caption-t a posztodhoz..."
                      className="w-full h-32 px-4 py-3 border-2 border-stone-200 rounded-lg focus:border-stone-600 focus:ring-2 focus:ring-stone-200 outline-none transition-all resize-none disabled:bg-stone-50 disabled:text-stone-600 disabled:cursor-not-allowed"
                      maxLength={2200}
                      disabled={viewingSharedFeed}
                    />
                    <div className="text-xs text-stone-500 text-right">
                      {(caption || '').length} / 2200 karakter
                    </div>
                  </div>

                  {/* Scheduled Date */}
                  <div className="space-y-3">
                    <label className="flex items-center gap-2 text-sm font-medium text-stone-700">
                      <Calendar className="w-4 h-4" />
                      Tervezett Dátum
                    </label>
                    <input
                      type="date"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-stone-200 rounded-lg focus:border-stone-600 focus:ring-2 focus:ring-stone-200 outline-none transition-all disabled:bg-stone-50 disabled:text-stone-600 disabled:cursor-not-allowed"
                      disabled={viewingSharedFeed}
                    />
                  </div>

                  {/* Scheduled Time */}
                  <div className="space-y-3">
                    <label className="flex items-center gap-2 text-sm font-medium text-stone-700">
                      <Clock className="w-4 h-4" />
                      Tervezett Időpont
                    </label>
                    <input
                      type="time"
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-stone-200 rounded-lg focus:border-stone-600 focus:ring-2 focus:ring-stone-200 outline-none transition-all disabled:bg-stone-50 disabled:text-stone-600 disabled:cursor-not-allowed"
                      disabled={viewingSharedFeed}
                    />
                  </div>

                  {/* Scheduled preview */}
                  {scheduledDate && scheduledTime && (
                    <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                      <p className="text-sm text-stone-700">
                        <span className="font-semibold">Tervezett időpont:</span>
                        <br />
                        {new Date(`${scheduledDate}T${scheduledTime}`).toLocaleString('hu-HU', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  )}
                </div>

                {/* Comments Panel */}
                <div className="lg:col-span-1 flex flex-col min-h-[500px]">
                  <CommentsPanel postId={postId} viewingSharedFeed={viewingSharedFeed} />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-stone-200 bg-stone-50">
              <button
                onClick={onClose}
                className="px-6 py-2.5 text-stone-700 hover:bg-stone-200 rounded-lg transition-colors border border-stone-300"
              >
                {viewingSharedFeed ? 'Bezárás' : 'Mégse'}
              </button>
              {!viewingSharedFeed && (
                <button
                  onClick={handleSave}
                  className="px-6 py-2.5 bg-stone-800 text-white rounded-lg hover:bg-stone-900 transition-all shadow-md hover:shadow-lg"
                >
                  Mentés
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
