import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Calendar, Clock, MessageSquare, StickyNote } from 'lucide-react';

interface EditPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  image?: string;
  caption?: string;
  scheduledTime?: string;
  notes?: string;
  onSave: (caption: string, scheduledTime: string, notes: string) => void;
  viewingSharedFeed?: boolean;
}

export const EditPostModal: React.FC<EditPostModalProps> = ({
  isOpen,
  onClose,
  image,
  caption: initialCaption = '',
  scheduledTime: initialScheduledTime = '',
  notes: initialNotes = '',
  onSave,
  viewingSharedFeed,
}) => {
  const [caption, setCaption] = useState(initialCaption || '');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [notes, setNotes] = useState(initialNotes || '');

  useEffect(() => {
    setCaption(initialCaption || '');
    setNotes(initialNotes || '');
    
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
  }, [initialCaption, initialScheduledTime, initialNotes, isOpen]);

  const handleSave = () => {
    const datetime = `${scheduledDate}T${scheduledTime}`;
    onSave(caption, datetime, notes);
    onClose();
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
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-lg shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden border border-stone-200"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-stone-200">
              <h2 className="text-2xl font-semibold text-stone-900">Poszt Részletei</h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-stone-700" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Image preview */}
                {image && (
                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-stone-700">
                      Kép Előnézet
                    </label>
                    <div className="rounded-lg overflow-hidden border-2 border-stone-200" style={{ aspectRatio: '4/5' }}>
                      <img
                        src={image}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                )}

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
                      className="w-full h-32 px-4 py-3 border-2 border-stone-200 rounded-lg focus:border-stone-600 focus:ring-2 focus:ring-stone-200 outline-none transition-all resize-none"
                      maxLength={2200}
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
                      className="w-full px-4 py-3 border-2 border-stone-200 rounded-lg focus:border-stone-600 focus:ring-2 focus:ring-stone-200 outline-none transition-all"
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
                      className="w-full px-4 py-3 border-2 border-stone-200 rounded-lg focus:border-stone-600 focus:ring-2 focus:ring-stone-200 outline-none transition-all"
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

                  {/* Notes */}
                  <div className="space-y-3">
                    <label className="flex items-center gap-2 text-sm font-medium text-stone-700">
                      <StickyNote className="w-4 h-4" />
                      Jegyzetek
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Írj jegyzeteket a posztodhoz..."
                      className="w-full h-32 px-4 py-3 border-2 border-stone-200 rounded-lg focus:border-stone-600 focus:ring-2 focus:ring-stone-200 outline-none transition-all resize-none"
                      maxLength={2200}
                    />
                    <div className="text-xs text-stone-500 text-right">
                      {(notes || '').length} / 2200 karakter
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-stone-200 bg-stone-50">
              <button
                onClick={onClose}
                className="px-6 py-2.5 text-stone-700 hover:bg-stone-200 rounded-lg transition-colors border border-stone-300"
              >
                Mégse
              </button>
              <button
                onClick={handleSave}
                className="px-6 py-2.5 bg-stone-800 text-white rounded-lg hover:bg-stone-900 transition-all shadow-md hover:shadow-lg"
              >
                Mentés
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};