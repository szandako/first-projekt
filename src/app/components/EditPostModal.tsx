import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Calendar, Clock, MessageSquare, Upload, Trash2, ChevronLeft, ChevronRight, Image, FileText, MessageCircle } from 'lucide-react';
import { usePostImages } from '../../hooks/usePostImages';
import { useIsMobile } from './ui/use-mobile';
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
  const isMobile = useIsMobile();
  const [caption, setCaption] = useState(initialCaption || '');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<'image' | 'details' | 'comments'>('image');

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

      // Elfogadjuk a képeket típus alapján, vagy kiterjesztés alapján (HEIC/HEIF esetén)
      const isImage = file.type.startsWith('image/') ||
        file.type === '' || // iOS néha üres típust ad HEIC-nek
        /\.(jpg|jpeg|png|gif|webp|heic|heif|bmp)$/i.test(file.name);

      if (!isImage) {
        toast.error('Csak képfájlokat tölthetsz fel');
        return;
      }

      // Nincs előzetes méretkorlátozás - a tömörítés kezeli
      // A createImageBitmap API nagy fájlokat is tud kezelni

      const position = images.length;
      await addImage(file, userId, feedId, position);
      toast.success('Kép feltöltve!');
    } catch (error: any) {
      console.error('Error uploading image:', error);
      // Részletesebb hibaüzenet
      const errorMessage = error?.message || 'Ismeretlen hiba';
      toast.error(`Hiba: ${errorMessage}`);
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
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-0 sm:p-4"
        >
          <motion.div
            initial={{ scale: isMobile ? 1 : 0.9, opacity: 0, y: isMobile ? 20 : 0 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: isMobile ? 1 : 0.9, opacity: 0, y: isMobile ? 20 : 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white shadow-2xl w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-6xl sm:rounded-lg overflow-hidden border-0 sm:border border-stone-200 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-stone-200 flex-shrink-0">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <h2 className="text-lg sm:text-2xl font-semibold text-stone-900 truncate">Poszt Részletei</h2>
                {viewingSharedFeed && (
                  <span className="px-2 sm:px-3 py-0.5 sm:py-1 bg-amber-100 text-amber-800 text-[10px] sm:text-xs font-medium rounded-full border border-amber-200 flex-shrink-0">
                    Csak olvasható
                  </span>
                )}
              </div>
              <button
                onClick={onClose}
                className="p-2 sm:p-2 hover:bg-stone-100 rounded-lg transition-colors flex-shrink-0 min-w-[40px] min-h-[40px] flex items-center justify-center"
              >
                <X className="w-5 h-5 text-stone-700" />
              </button>
            </div>

            {/* Mobile Tab Navigation */}
            {isMobile && (
              <div className="flex border-b border-stone-200 flex-shrink-0">
                <button
                  onClick={() => setActiveTab('image')}
                  className={`flex-1 py-3 px-2 text-sm font-medium flex items-center justify-center gap-1.5 transition-colors ${
                    activeTab === 'image'
                      ? 'text-stone-900 border-b-2 border-stone-800 bg-stone-50'
                      : 'text-stone-500 hover:text-stone-700'
                  }`}
                >
                  <Image className="w-4 h-4" />
                  Kép
                </button>
                <button
                  onClick={() => setActiveTab('details')}
                  className={`flex-1 py-3 px-2 text-sm font-medium flex items-center justify-center gap-1.5 transition-colors ${
                    activeTab === 'details'
                      ? 'text-stone-900 border-b-2 border-stone-800 bg-stone-50'
                      : 'text-stone-500 hover:text-stone-700'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  Részletek
                </button>
                <button
                  onClick={() => setActiveTab('comments')}
                  className={`flex-1 py-3 px-2 text-sm font-medium flex items-center justify-center gap-1.5 transition-colors ${
                    activeTab === 'comments'
                      ? 'text-stone-900 border-b-2 border-stone-800 bg-stone-50'
                      : 'text-stone-500 hover:text-stone-700'
                  }`}
                >
                  <MessageCircle className="w-4 h-4" />
                  Kommentek
                </button>
              </div>
            )}

            {/* Content */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 min-h-0">
              {/* Desktop: Grid layout */}
              <div className={`${isMobile ? 'hidden' : 'grid'} lg:grid-cols-3 gap-6`}>
                {/* Image carousel - Desktop */}
                <div className="space-y-3">
                  <label className="flex items-center justify-between text-sm font-medium text-stone-700">
                    <span>Képek ({images.length})</span>
                    {!viewingSharedFeed && (
                      <label className="cursor-pointer px-3 py-1.5 bg-stone-800 text-white rounded-lg hover:bg-stone-900 transition-all text-xs flex items-center gap-2 min-h-[36px]">
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
                          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-black/60 text-white text-xs rounded-full">
                            {currentImageIndex + 1} / {images.length}
                          </div>
                        </>
                      )}

                      {!viewingSharedFeed && images[currentImageIndex] && (
                        <button
                          onClick={() => handleDeleteImage(images[currentImageIndex].id, images[currentImageIndex].storage_path)}
                          className="absolute top-3 right-3 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-all shadow-lg"
                          title="Kép törlése"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}

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

                {/* Form - Desktop */}
                <div className="space-y-6">
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

                {/* Comments Panel - Desktop */}
                <div className="lg:col-span-1 flex flex-col min-h-[500px]">
                  <CommentsPanel postId={postId} viewingSharedFeed={viewingSharedFeed} />
                </div>
              </div>

              {/* Mobile: Tab-based layout */}
              {isMobile && (
                <div className="h-full">
                  {/* Image Tab */}
                  {activeTab === 'image' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-stone-700">Képek ({images.length})</span>
                        {!viewingSharedFeed && (
                          <label className="cursor-pointer px-4 py-2.5 bg-stone-800 text-white rounded-lg hover:bg-stone-900 transition-all text-sm flex items-center gap-2 min-h-[44px]">
                            <Upload className="w-4 h-4" />
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
                      </div>

                      {loading ? (
                        <div className="rounded-lg border-2 border-stone-200 flex items-center justify-center aspect-square">
                          <p className="text-stone-500">Betöltés...</p>
                        </div>
                      ) : images.length === 0 ? (
                        <div className="rounded-lg border-2 border-dashed border-stone-300 flex items-center justify-center bg-stone-50 aspect-square">
                          <div className="text-center p-6">
                            <Upload className="w-16 h-16 mx-auto mb-4 text-stone-400" />
                            <p className="text-stone-600">
                              {viewingSharedFeed ? 'Nincs feltöltött kép' : 'Koppints a "Kép hozzáadása" gombra!'}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="relative">
                          <div className="rounded-lg overflow-hidden border-2 border-stone-200 aspect-square">
                            <img
                              src={images[currentImageIndex]?.url}
                              alt={`Image ${currentImageIndex + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </div>

                          {images.length > 1 && (
                            <>
                              <button
                                onClick={prevImage}
                                className="absolute left-2 top-1/2 -translate-y-1/2 p-3 bg-white/90 hover:bg-white rounded-full shadow-lg transition-all"
                              >
                                <ChevronLeft className="w-6 h-6 text-stone-700" />
                              </button>
                              <button
                                onClick={nextImage}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-3 bg-white/90 hover:bg-white rounded-full shadow-lg transition-all"
                              >
                                <ChevronRight className="w-6 h-6 text-stone-700" />
                              </button>
                              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-black/60 text-white text-sm rounded-full">
                                {currentImageIndex + 1} / {images.length}
                              </div>
                            </>
                          )}

                          {!viewingSharedFeed && images[currentImageIndex] && (
                            <button
                              onClick={() => handleDeleteImage(images[currentImageIndex].id, images[currentImageIndex].storage_path)}
                              className="absolute top-3 right-3 p-3 bg-red-500 text-white rounded-full hover:bg-red-600 transition-all shadow-lg"
                              title="Kép törlése"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          )}

                          {images.length > 1 && (
                            <div className="flex justify-center gap-2 mt-4">
                              {images.map((_, index) => (
                                <button
                                  key={index}
                                  onClick={() => setCurrentImageIndex(index)}
                                  className={`h-2 rounded-full transition-all ${
                                    index === currentImageIndex
                                      ? 'bg-stone-800 w-8'
                                      : 'bg-stone-300 w-2'
                                  }`}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Details Tab */}
                  {activeTab === 'details' && (
                    <div className="space-y-5">
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm font-medium text-stone-700">
                          <MessageSquare className="w-4 h-4" />
                          Caption
                        </label>
                        <textarea
                          value={caption}
                          onChange={(e) => setCaption(e.target.value)}
                          placeholder="Írj egy caption-t a posztodhoz..."
                          className="w-full h-40 px-4 py-3 border-2 border-stone-200 rounded-lg focus:border-stone-600 focus:ring-2 focus:ring-stone-200 outline-none transition-all resize-none disabled:bg-stone-50 disabled:text-stone-600 disabled:cursor-not-allowed text-base"
                          maxLength={2200}
                          disabled={viewingSharedFeed}
                        />
                        <div className="text-xs text-stone-500 text-right">
                          {(caption || '').length} / 2200 karakter
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm font-medium text-stone-700">
                          <Calendar className="w-4 h-4" />
                          Tervezett Dátum
                        </label>
                        <input
                          type="date"
                          value={scheduledDate}
                          onChange={(e) => setScheduledDate(e.target.value)}
                          className="w-full px-4 py-3 border-2 border-stone-200 rounded-lg focus:border-stone-600 focus:ring-2 focus:ring-stone-200 outline-none transition-all disabled:bg-stone-50 disabled:text-stone-600 disabled:cursor-not-allowed text-base min-h-[48px]"
                          disabled={viewingSharedFeed}
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm font-medium text-stone-700">
                          <Clock className="w-4 h-4" />
                          Tervezett Időpont
                        </label>
                        <input
                          type="time"
                          value={scheduledTime}
                          onChange={(e) => setScheduledTime(e.target.value)}
                          className="w-full px-4 py-3 border-2 border-stone-200 rounded-lg focus:border-stone-600 focus:ring-2 focus:ring-stone-200 outline-none transition-all disabled:bg-stone-50 disabled:text-stone-600 disabled:cursor-not-allowed text-base min-h-[48px]"
                          disabled={viewingSharedFeed}
                        />
                      </div>

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
                  )}

                  {/* Comments Tab */}
                  {activeTab === 'comments' && (
                    <div className="h-full flex flex-col" style={{ minHeight: 'calc(100vh - 280px)' }}>
                      <CommentsPanel postId={postId} viewingSharedFeed={viewingSharedFeed} />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 sm:gap-3 p-4 sm:p-6 border-t border-stone-200 bg-stone-50 flex-shrink-0">
              <button
                onClick={onClose}
                className="px-4 sm:px-6 py-2.5 sm:py-2.5 text-stone-700 hover:bg-stone-200 rounded-lg transition-colors border border-stone-300 min-h-[44px] text-sm sm:text-base"
              >
                {viewingSharedFeed ? 'Bezárás' : 'Mégse'}
              </button>
              {!viewingSharedFeed && (
                <button
                  onClick={handleSave}
                  className="px-4 sm:px-6 py-2.5 sm:py-2.5 bg-stone-800 text-white rounded-lg hover:bg-stone-900 transition-all shadow-md hover:shadow-lg min-h-[44px] text-sm sm:text-base"
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
