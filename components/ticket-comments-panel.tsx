'use client';

import { useEffect, useState, useCallback } from 'react';
import DOMPurify from 'dompurify';
import { Button } from '@/components/ui/button';
import { MessageSquare, Send, X, User, Pencil, Check } from 'lucide-react';
import { useToast } from '@/components/island-toast';
import { TipTapEditor } from '@/components/tiptap-editor';

interface Comment {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
}

interface TicketCommentsPanelProps {
  ticketId: string;
  currentUserId?: string | null;
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function TicketCommentsPanel({ ticketId, currentUserId }: TicketCommentsPanelProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [sending, setSending] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [savingEditId, setSavingEditId] = useState<string | null>(null);
  const [editorKey, setEditorKey] = useState(0);
  const { showToast } = useToast();

  const fetchComments = useCallback(async () => {
    try {
      const res = await fetch(`/api/tickets/${ticketId}/comments`);
      if (!res.ok) throw new Error('Failed to fetch comments');
      const data = await res.json();
      setComments(data);
    } catch (err) {
      console.error('Error fetching comments:', err);
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  async function handleSubmit() {
    if (!newComment.trim()) return;

    setSending(true);
    try {
      const res = await fetch(`/api/tickets/${ticketId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newComment.trim() }),
      });

      if (!res.ok) throw new Error('Failed to add comment');

      const comment = await res.json();
      setComments((prev) => [...prev, comment]);
      setNewComment('');
      setEditorKey((k) => k + 1);
      showToast('Comment added', 'success');
    } catch (err) {
      console.error('Error adding comment:', err);
      showToast('Failed to add comment', 'error');
    } finally {
      setSending(false);
    }
  }

  async function handleSaveEdit(commentId: string) {
    if (!editContent.trim()) return;
    setSavingEditId(commentId);
    try {
      const res = await fetch(`/api/tickets/${ticketId}/comments/${commentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editContent.trim() }),
      });
      if (!res.ok) throw new Error('Failed to update comment');
      const updated = await res.json();
      setComments((prev) => prev.map((c) => (c.id === commentId ? updated : c)));
      setEditingId(null);
      setEditContent('');
      showToast('Comment updated', 'success');
    } catch (err) {
      console.error('Error updating comment:', err);
      showToast('Failed to update comment', 'error');
    } finally {
      setSavingEditId(null);
    }
  }

  async function handleDelete(commentId: string) {
    setDeletingId(commentId);
    try {
      const res = await fetch(`/api/tickets/${ticketId}/comments/${commentId}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to delete comment');

      setComments((prev) => prev.filter((c) => c.id !== commentId));
      showToast('Comment deleted', 'success');
    } catch (err) {
      console.error('Error deleting comment:', err);
      showToast('Failed to delete comment', 'error');
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <MessageSquare className="h-4 w-4" />
        Comments ({comments.length})
      </h3>

      {comments.length === 0 ? (
        <div className="text-center py-6 border-2 border-dashed border-border rounded-xl bg-muted/30">
          <MessageSquare className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No comments yet</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Start the conversation</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className="flex gap-3 p-3 rounded-lg border border-border bg-card/40"
            >
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <User className="h-4 w-4" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    {comment.user_id === currentUserId ? 'You' : 'Team member'}
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground/60">
                      {formatRelativeTime(comment.created_at)}
                    </span>
                    {comment.user_id === currentUserId && editingId !== comment.id && (
                      <>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-foreground"
                          onClick={() => {
                            setEditingId(comment.id);
                            setEditContent(comment.content);
                          }}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDelete(comment.id)}
                          disabled={deletingId === comment.id}
                        >
                          {deletingId === comment.id ? (
                            <div className="animate-spin h-3 w-3 border-2 border-current border-t-transparent rounded-full" />
                          ) : (
                            <X className="h-3 w-3" />
                          )}
                        </Button>
                      </>
                    )}
                    {editingId === comment.id && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          setEditingId(null);
                          setEditContent('');
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
                {editingId === comment.id ? (
                  <div className="mt-2 space-y-2">
                    <TipTapEditor
                      content={editContent}
                      onChange={setEditContent}
                      placeholder="Edit comment..."
                      disabled={savingEditId === comment.id}
                    />
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        className="rounded-full gap-2 h-7 text-xs"
                        onClick={() => handleSaveEdit(comment.id)}
                        disabled={!editContent.trim() || savingEditId === comment.id}
                      >
                        {savingEditId === comment.id ? (
                          <div className="animate-spin h-3 w-3 border-2 border-current border-t-transparent rounded-full" />
                        ) : (
                          <Check className="h-3 w-3" />
                        )}
                        Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div
                    className="text-sm text-foreground mt-1 prose prose-sm max-w-none [&_h1]:text-lg [&_h1]:font-bold [&_h2]:text-base [&_h2]:font-bold [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-2 [&_blockquote]:italic [&_code]:bg-muted [&_code]:px-1 [&_code]:rounded [&_a]:text-primary [&_a]:underline"
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(comment.content) }}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="pt-2 border-t border-border space-y-2">
        <TipTapEditor
          key={editorKey}
          content={newComment}
          onChange={setNewComment}
          placeholder="Add a comment..."
          disabled={sending}
        />
        <div className="flex justify-end">
          <Button
            onClick={handleSubmit}
            disabled={!newComment.trim() || sending}
            className="rounded-full gap-2"
            size="sm"
          >
            {sending ? (
              <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}
