import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, Trash2, Edit2, X, Check } from 'lucide-react';
import { useComments } from '../../hooks/useComments';
import { useAuthContext } from '../../context/AuthContext';
import { toast } from 'sonner';

interface CommentsPanelProps {
  postId: string;
  viewingSharedFeed: boolean;
}

export const CommentsPanel: React.FC<CommentsPanelProps> = ({ postId, viewingSharedFeed }) => {
  const { user } = useAuthContext();
  const { comments, loading, addComment, updateComment, deleteComment } = useComments(postId);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const commentsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new comments arrive
  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments.length]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      setSubmitting(true);
      await addComment(newComment);
      setNewComment('');
      toast.success('Komment hozzáadva!');
    } catch (error: any) {
      console.error('Error adding comment:', error);
      toast.error('Hiba történt a komment hozzáadásakor');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartEdit = (commentId: string, content: string) => {
    setEditingCommentId(commentId);
    setEditingContent(content);
  };

  const handleCancelEdit = () => {
    setEditingCommentId(null);
    setEditingContent('');
  };

  const handleSaveEdit = async (commentId: string) => {
    if (!editingContent.trim()) return;

    try {
      await updateComment(commentId, editingContent);
      setEditingCommentId(null);
      setEditingContent('');
      toast.success('Komment frissítve!');
    } catch (error: any) {
      console.error('Error updating comment:', error);
      toast.error('Hiba történt a frissítés során');
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!window.confirm('Biztosan törölni szeretnéd ezt a kommentet?')) return;

    try {
      await deleteComment(commentId);
      toast.success('Komment törölve!');
    } catch (error: any) {
      console.error('Error deleting comment:', error);
      toast.error('Hiba történt a törlés során');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'most';
    if (diffMins < 60) return `${diffMins} perce`;
    if (diffHours < 24) return `${diffHours} órája`;
    if (diffDays < 7) return `${diffDays} napja`;
    return date.toLocaleDateString('hu-HU', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="flex flex-col h-full bg-stone-50 rounded-lg border-2 border-stone-200">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-stone-200 bg-white rounded-t-lg">
        <MessageSquare className="w-5 h-5 text-stone-700" />
        <h3 className="font-semibold text-stone-900">Kommentek</h3>
        <span className="ml-auto text-sm text-stone-500">({comments.length})</span>
      </div>

      {/* Comments List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
        {loading ? (
          <div className="text-center py-8 text-stone-500">Betöltés...</div>
        ) : comments.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 text-stone-300" />
            <p className="text-stone-500 text-sm">Még nincs komment</p>
            <p className="text-stone-400 text-xs mt-1">Légy te az első!</p>
          </div>
        ) : (
          <>
            {comments.map((comment) => {
              const isOwnComment = comment.user_id === user?.id;
              const isEditing = editingCommentId === comment.id;

              return (
                <div
                  key={comment.id}
                  className={`p-3 rounded-lg border ${
                    isOwnComment
                      ? 'bg-stone-800 text-white border-stone-700'
                      : 'bg-white text-stone-900 border-stone-200'
                  }`}
                >
                  {/* Header: User + Time */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          isOwnComment ? 'bg-stone-600' : 'bg-stone-200 text-stone-700'
                        }`}
                      >
                        {(comment.user_full_name || comment.user_email || 'U')[0].toUpperCase()}
                      </div>
                      <span className={`text-sm font-medium ${isOwnComment ? 'text-stone-200' : 'text-stone-700'}`}>
                        {comment.user_full_name || comment.user_email || 'Ismeretlen'}
                      </span>
                    </div>
                    <span className={`text-xs ${isOwnComment ? 'text-stone-400' : 'text-stone-500'}`}>
                      {formatDate(comment.created_at)}
                    </span>
                  </div>

                  {/* Content */}
                  {isEditing ? (
                    <div className="space-y-2">
                      <textarea
                        value={editingContent}
                        onChange={(e) => setEditingContent(e.target.value)}
                        className="w-full px-3 py-2 border-2 border-stone-300 rounded-lg focus:border-stone-600 focus:ring-2 focus:ring-stone-200 outline-none resize-none text-stone-900"
                        rows={3}
                        maxLength={5000}
                      />
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleSaveEdit(comment.id)}
                          className="px-3 py-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm flex items-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Mentés
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="px-3 py-1.5 bg-stone-300 text-stone-700 rounded-lg hover:bg-stone-400 transition-colors text-sm flex items-center gap-1"
                        >
                          <X className="w-3.5 h-3.5" />
                          Mégse
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className={`text-sm whitespace-pre-wrap break-words ${isOwnComment ? 'text-stone-100' : 'text-stone-700'}`}>
                        {comment.content}
                      </p>

                      {/* Actions (only for own comments) */}
                      {isOwnComment && (
                        <div className="flex items-center gap-2 mt-3">
                          <button
                            onClick={() => handleStartEdit(comment.id, comment.content)}
                            className="text-xs px-2.5 py-1.5 bg-stone-700 text-stone-200 rounded hover:bg-stone-600 transition-colors flex items-center gap-1 min-h-[32px]"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Szerkesztés</span>
                          </button>
                          <button
                            onClick={() => handleDelete(comment.id)}
                            className="text-xs px-2.5 py-1.5 bg-red-500 text-white rounded hover:bg-red-600 transition-colors flex items-center gap-1 min-h-[32px]"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Törlés</span>
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
            <div ref={commentsEndRef} />
          </>
        )}
      </div>

      {/* New Comment Form */}
      <form onSubmit={handleSubmit} className="p-3 sm:p-4 border-t border-stone-200 bg-white rounded-b-lg">
        <div className="flex gap-2">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Írj egy kommentet..."
            className="flex-1 px-3 py-2.5 border-2 border-stone-200 rounded-lg focus:border-stone-600 focus:ring-2 focus:ring-stone-200 outline-none resize-none text-sm sm:text-base min-h-[44px]"
            rows={2}
            maxLength={5000}
            disabled={submitting}
          />
          <button
            type="submit"
            disabled={!newComment.trim() || submitting}
            className="px-3 sm:px-4 py-2 bg-stone-800 text-white rounded-lg hover:bg-stone-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 sm:gap-2 min-h-[44px] min-w-[44px] justify-center"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">{submitting ? 'Küldés...' : 'Küldés'}</span>
          </button>
        </div>
        <div className="text-xs text-stone-500 mt-1 text-right">
          {newComment.length} / 5000 karakter
        </div>
      </form>
    </div>
  );
};
