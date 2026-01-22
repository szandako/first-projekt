import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Save, StickyNote } from 'lucide-react';

interface NotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  notes?: string;
  postId: number;
  onSave: (notes: string) => Promise<void>;
  image?: string;
}

export const NotesModal: React.FC<NotesModalProps> = ({
  isOpen,
  onClose,
  notes: initialNotes = '',
  postId,
  onSave,
  image,
}) => {
  const [notes, setNotes] = useState(initialNotes || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setNotes(initialNotes || '');
  }, [initialNotes, isOpen]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(notes);
      onClose();
    } catch (error) {
      console.error('Error saving notes:', error);
      alert('Hiba történt a megjegyzés mentése során');
    } finally {
      setSaving(false);
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
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden border border-stone-200"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-stone-200 bg-amber-50">
              <div className="flex items-center gap-3">
                <div className="bg-amber-500 text-white p-2 rounded-lg">
                  <StickyNote className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-stone-900">Megjegyzések</h2>
                  <p className="text-sm text-stone-600">Poszt #{postId} - Collaborative szerkesztés</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-amber-100 rounded-lg transition-colors"
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

                {/* Notes Form */}
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-900">
                      💡 <strong>Collaborative mező:</strong> A tulajdonos és a megtekintők is szerkeszthetik ezt a mezőt.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <label className="flex items-center gap-2 text-sm font-medium text-stone-700">
                      <StickyNote className="w-4 h-4" />
                      Megjegyzések
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Írj megjegyzéseket ehhez a poszthoz... (mindkét fél láthatja és szerkesztheti)"
                      className="w-full h-64 px-4 py-3 border-2 border-amber-200 rounded-lg focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition-all resize-none"
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
                disabled={saving}
                className="px-6 py-2.5 text-stone-700 hover:bg-stone-200 rounded-lg transition-colors border border-stone-300 disabled:opacity-50"
              >
                Bezárás
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-all shadow-md hover:shadow-lg flex items-center gap-2 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Mentés...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Mentés
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
