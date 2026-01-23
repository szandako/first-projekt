import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Calendar, Trash2, Edit2 } from 'lucide-react';

interface FeedCardProps {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  isOwner: boolean;
  onDelete: (id: string) => void;
  onEdit: (id: string, name: string, description: string | null) => void;
}

export const FeedCard: React.FC<FeedCardProps> = ({
  id,
  name,
  description,
  created_at,
  isOwner,
  onDelete,
  onEdit,
}) => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/feed/${id}`);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Biztosan törölni szeretnéd a "${name}" feedet?`)) {
      onDelete(id);
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newName = window.prompt('Új név:', name);
    if (newName && newName.trim()) {
      onEdit(id, newName.trim(), description);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      onClick={handleClick}
      className="bg-white border-2 border-stone-200 rounded-lg p-6 cursor-pointer hover:border-stone-400 transition-all"
    >
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-xl font-semibold text-stone-900">{name}</h3>
        {isOwner && (
          <div className="flex gap-2">
            <button
              onClick={handleEdit}
              className="p-1.5 hover:bg-stone-100 rounded transition-colors"
              title="Átnevezés"
            >
              <Edit2 className="w-4 h-4 text-stone-600" />
            </button>
            <button
              onClick={handleDelete}
              className="p-1.5 hover:bg-red-50 rounded transition-colors"
              title="Törlés"
            >
              <Trash2 className="w-4 h-4 text-red-600" />
            </button>
          </div>
        )}
      </div>

      {description && (
        <p className="text-stone-600 text-sm mb-4 line-clamp-2">{description}</p>
      )}

      <div className="flex items-center gap-2 text-xs text-stone-500">
        <Calendar className="w-3.5 h-3.5" />
        <span>
          {new Date(created_at).toLocaleDateString('hu-HU', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </span>
      </div>

      {!isOwner && (
        <div className="mt-3 pt-3 border-t border-stone-200">
          <span className="text-xs text-stone-500 bg-stone-100 px-2 py-1 rounded">
            Megosztva veled
          </span>
        </div>
      )}
    </motion.div>
  );
};
