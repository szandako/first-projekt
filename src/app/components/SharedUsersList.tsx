import React from 'react';
import { UserX, Eye } from 'lucide-react';
import { FeedShare } from '../../hooks/useFeedShares';

interface SharedUsersListProps {
  shares: FeedShare[];
  onRemoveShare: (shareId: string, sharedWithEmail: string) => void;
}

export const SharedUsersList: React.FC<SharedUsersListProps> = ({
  shares,
  onRemoveShare,
}) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('hu-HU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-2">
      {shares.map((share) => (
        <div
          key={share.id}
          className="flex items-center justify-between p-4 bg-stone-50 border border-stone-200 rounded-lg hover:bg-stone-100 transition-colors"
        >
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className="w-10 h-10 rounded-full bg-stone-300 flex items-center justify-center text-stone-700 font-bold">
              {(share.shared_with_full_name || share.shared_with_email || 'U')[0].toUpperCase()}
            </div>

            {/* User Info */}
            <div>
              <p className="font-medium text-stone-900">
                {share.shared_with_full_name || share.shared_with_email || 'Ismeretlen'}
              </p>
              <p className="text-xs text-stone-500">{share.shared_with_email}</p>
              <p className="text-xs text-stone-400 mt-0.5">
                Megosztva: {formatDate(share.created_at)}
              </p>
            </div>
          </div>

          {/* Permission Badge & Remove Button */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-xs font-medium">
              <Eye className="w-3.5 h-3.5" />
              Viewer
            </div>
            <button
              onClick={() => onRemoveShare(share.id, share.shared_with_email || '')}
              className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              title="Megosztás visszavonása"
            >
              <UserX className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
