import React, { useState, useRef, useEffect } from 'react';
import { useDrop, useDrag } from 'react-dnd';
import { NativeTypes } from 'react-dnd-html5-backend';
import { motion, AnimatePresence } from 'motion/react';
import { Edit3, X, Hand } from 'lucide-react';

interface Post {
  id: number;
  image?: string;
  caption?: string;
  scheduledTime?: string;
  notes?: string;
}

interface GridCellProps {
  post: Post;
  onDrop: (dragId: number, dropId: number) => void;
  onDragStart: (postId: number) => void;
  onPaste: (postId: number) => void;
  onImageLoad: (postId: number, imageData: string) => void;
  onEditClick: (postId: number) => void;
  onRemove: (postId: number) => void;
  readOnly?: boolean;
}

export const GridCell: React.FC<GridCellProps> = ({
  post,
  onDrop,
  onDragStart,
  onPaste,
  onImageLoad,
  onEditClick,
  onRemove,
  readOnly
}) => {
  const [isHovering, setIsHovering] = useState(false);
  const [hoverProgress, setHoverProgress] = useState(0);
  const [showEdit, setShowEdit] = useState(false);
  const [dragMode, setDragMode] = useState(false);
  const [showReadOnlyInfo, setShowReadOnlyInfo] = useState(false);
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Drag and drop for swapping posts
  const [{ isDragging }, drag] = useDrag({
    type: 'POST',
    item: { id: post.id },
    canDrag: () => dragMode && !!post.image,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
    end: () => setDragMode(false),
  });

  const [{ isOverSwap }, dropSwap] = useDrop({
    accept: 'POST',
    drop: (item: { id: number }) => {
      if (item.id !== post.id && onDrop) {
        onDrop(item.id, post.id);
      }
    },
    collect: (monitor) => ({
      isOverSwap: monitor.isOver(),
    }),
  });

  const [{ isOver, canDrop }, drop] = useDrop({
    accept: [NativeTypes.FILE],
    drop: (item: { files: File[] }) => {
      const file = item.files[0];
      if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) {
            onImageLoad(post.id, e.target.result as string);
          }
        };
        reader.readAsDataURL(file);
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  });

  const handleMouseEnter = () => {
    if (!post.image || readOnly) return;
    
    setIsHovering(true);
    setHoverProgress(0);
    
    // Progress animation
    progressIntervalRef.current = setInterval(() => {
      setHoverProgress((prev) => {
        const next = prev + (100 / 30); // 3 seconds = 3000ms / 100ms intervals
        return next >= 100 ? 100 : next;
      });
    }, 100);

    // Timer to show edit
    hoverTimerRef.current = setTimeout(() => {
      setShowEdit(true);
      onEditClick(post.id);
    }, 3000);
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
    setHoverProgress(0);
    setShowEdit(false);
    
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }
  };

  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
      }
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  const handlePasteEvent = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            if (event.target?.result) {
              onImageLoad(post.id, event.target.result as string);
            }
          };
          reader.readAsDataURL(file);
        }
      }
    }
  };

  const isActive = isOver && canDrop;

  // Combine drop and dropSwap refs
  const combinedRef = (node: HTMLDivElement | null) => {
    drop(node);
    dropSwap(node);
  };

  return (
    <div
      ref={readOnly ? null : combinedRef}
      className={`group relative bg-gray-50 overflow-hidden border border-gray-300 ${
        readOnly ? '' : 'hover:border-gray-400'
      } transition-colors ${
        isDragging ? 'opacity-50' : ''
      } ${isOverSwap ? 'ring-2 ring-blue-500' : ''}`}
      style={{ aspectRatio: '4/5' }}
      onMouseEnter={post.image ? (readOnly ? () => setShowReadOnlyInfo(true) : handleMouseEnter) : undefined}
      onMouseLeave={post.image ? (readOnly ? () => setShowReadOnlyInfo(false) : handleMouseLeave) : undefined}
      onPaste={readOnly ? undefined : handlePasteEvent}
      tabIndex={readOnly ? -1 : 0}
    >
      {post.image ? (
        <div ref={dragMode && !readOnly ? drag : null} className="w-full h-full">
          <img
            src={post.image}
            alt={`Grid ${post.id}`}
            className="w-full h-full object-cover"
          />
          
          {/* Read-only hover info overlay */}
          {readOnly && (
            <AnimatePresence>
              {showReadOnlyInfo && (post.caption || post.scheduledTime || post.notes) && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/70 flex flex-col items-center justify-center p-4"
                >
                  <div className="w-full max-h-full overflow-y-auto space-y-3">
                    {post.scheduledTime && (
                      <div className="bg-white/95 rounded-lg p-3 shadow-lg">
                        <div className="text-xs font-semibold text-stone-500 mb-1">
                          ⏰ Tervezett időpont
                        </div>
                        <div className="text-sm text-stone-900">
                          {new Date(post.scheduledTime).toLocaleString('hu-HU', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                    )}
                    {post.caption && (
                      <div className="bg-white/95 rounded-lg p-3 shadow-lg">
                        <div className="text-xs font-semibold text-stone-500 mb-1">
                          📝 Caption
                        </div>
                        <div className="text-sm text-stone-900 whitespace-pre-wrap max-h-32 overflow-y-auto">
                          {post.caption}
                        </div>
                      </div>
                    )}
                    {post.notes && (
                      <div className="bg-amber-50 rounded-lg p-3 shadow-lg border border-amber-200">
                        <div className="text-xs font-semibold text-amber-700 mb-1">
                          💭 Megjegyzések
                        </div>
                        <div className="text-sm text-stone-900 whitespace-pre-wrap max-h-32 overflow-y-auto">
                          {post.notes}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          )}
          
          {/* Edit mode hover overlay with progress (only if not read-only) */}
          {!readOnly && (
            <AnimatePresence>
              {isHovering && !showEdit && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-black/40 flex items-center justify-center"
                >
                  <div className="relative w-16 h-16">
                    <svg className="w-16 h-16 transform -rotate-90">
                      <circle
                        cx="32"
                        cy="32"
                        r="28"
                        stroke="white"
                        strokeOpacity="0.3"
                        strokeWidth="4"
                        fill="none"
                      />
                      <circle
                        cx="32"
                        cy="32"
                        r="28"
                        stroke="white"
                        strokeWidth="4"
                        fill="none"
                        strokeDasharray={`${2 * Math.PI * 28}`}
                        strokeDashoffset={`${2 * Math.PI * 28 * (1 - hoverProgress / 100)}`}
                        className="transition-all duration-100"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Edit3 className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          )}

          {/* Remove button (only if not read-only) */}
          {!readOnly && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove(post.id);
              }}
              className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full hover:bg-red-600 transition-colors opacity-0 hover:opacity-100 group-hover:opacity-100"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* Info badges (only if not read-only) */}
          {!readOnly && (post.caption || post.scheduledTime) && (
            <div className="absolute bottom-2 left-2 flex flex-col gap-1">
              {post.caption && (
                <div className="bg-blue-500 text-white text-xs px-2 py-1 rounded">
                  Caption beállítva
                </div>
              )}
              {post.scheduledTime && (
                <div className="bg-green-500 text-white text-xs px-2 py-1 rounded">
                  Időzítve
                </div>
              )}
            </div>
          )}

          {/* Move/Drag handle button (only if not read-only) */}
          {!readOnly && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setDragMode(true);
                // Stop hover timer and progress when entering drag mode
                setIsHovering(false);
                setHoverProgress(0);
                setShowEdit(false);
                if (hoverTimerRef.current) {
                  clearTimeout(hoverTimerRef.current);
                }
                if (progressIntervalRef.current) {
                  clearInterval(progressIntervalRef.current);
                }
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
              }}
              className={`absolute bottom-2 right-2 p-2 rounded-lg transition-all ${
                dragMode 
                  ? 'bg-blue-600 text-white shadow-lg' 
                  : 'bg-stone-800/70 hover:bg-stone-800 text-white opacity-0 hover:opacity-100 group-hover:opacity-100'
              }`}
              title="Kattints és húzd a képet másik helyre"
            >
              <Hand className="w-4 h-4" />
            </button>
          )}
        </div>
      ) : (
        <div
          className={`w-full h-full flex flex-col items-center justify-center transition-colors ${
            isActive ? 'bg-blue-50 border-blue-400' : ''
          }`}
        >
          {!readOnly && (
            <div className="text-gray-400 text-center p-4">
              <div className="text-3xl mb-2">📸</div>
              <p className="text-sm">Húzd ide a képet</p>
              <p className="text-xs mt-1">vagy Ctrl+V beillesztés</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};