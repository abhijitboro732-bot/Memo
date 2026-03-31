'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, Send, ChevronUp, Loader2, Edit2, Trash2, MoreHorizontal } from 'lucide-react';
import { MOCK_COMMENTS } from '@/lib/constants';
import { Comment } from '@/types';
import Avatar from './Avatar';
import { useProfile } from '@/lib/ProfileContext';
import { useAuth } from '@/lib/AuthContext';
import { fetchComments, addComment, toggleCommentLike, deleteComment, editComment } from '@/lib/supabase/interactions';

interface CommentSheetProps {
  isOpen: boolean;
  onClose: () => void;
  commentsCount: number;
  videoId?: string;
  authorId?: string; // We can optionally highlight creator's comments or likes
}

export interface SupaComment {
  id: string;
  post_id: string;
  user_id: string;
  username: string;
  avatar_url: string;
  text: string;
  likes: string[];
  parent_id: string | null;
  created_at: string;
}

export default function CommentSheet({ isOpen, onClose, commentsCount, videoId, authorId }: CommentSheetProps) {
  const [mockComments] = useState<Comment[]>(MOCK_COMMENTS);
  const [realComments, setRealComments] = useState<SupaComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [likedComments, setLikedComments] = useState<Set<string>>(new Set());
  const [totalComments, setTotalComments] = useState(commentsCount);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  
  // Advanced features state
  const [replyingTo, setReplyingTo] = useState<{ id: string; username: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null); // For mobile 3-dot menu

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const { profile } = useProfile();
  const { user, openAuthModal } = useAuth();

  // Fetch real comments
  useEffect(() => {
    if (isOpen && videoId) {
      setLoading(true);
      fetchComments(videoId).then(comments => {
        setRealComments(comments);
        if (comments.length > 0) {
          setTotalComments(comments.length + mockComments.length);
        }
        if (user) {
          const liked = new Set<string>();
          comments.forEach(c => {
            if (c.likes?.includes(user.id)) liked.add(c.id);
          });
          setLikedComments(liked);
        }
        setLoading(false);
      });
    }
  }, [isOpen, videoId, user, mockComments.length]);

  const handleLikeComment = async (id: string, isReal: boolean) => {
    if (!user) { openAuthModal(); return; }
    setLikedComments(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    if (isReal) await toggleCommentLike(id, user.id);
  };

  const handleSendComment = async () => {
    if (!newComment.trim()) return;
    if (!user) { openAuthModal(); return; }

    setSending(true);

    if (videoId) {
      const result = await addComment(
        videoId,
        user.id,
        profile.username,
        profile.avatar_url,
        newComment.trim(),
        replyingTo ? replyingTo.id : null
      );

      if (result) {
        setRealComments(prev => [result, ...prev]);
        setTotalComments(prev => prev + 1);
      }
    } else {
      setTotalComments(prev => prev + 1);
    }

    setNewComment('');
    setReplyingTo(null);
    setSending(false);
    listRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEditSubmit = async (id: string) => {
    if (!editDraft.trim() || !user) {
      setEditingId(null);
      return;
    }
    const success = await editComment(id, user.id, editDraft.trim());
    if (success) {
      setRealComments(prev => prev.map(c => c.id === id ? { ...c, text: editDraft.trim() } : c));
    }
    setEditingId(null);
    setEditDraft('');
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    if (confirm('Delete this comment?')) {
      const success = await deleteComment(id, user.id);
      if (success) {
        setRealComments(prev => prev.filter(c => c.id !== id && c.parent_id !== id));
        setTotalComments(prev => prev - 1);
      }
    }
    setActiveMenuId(null);
  };

  const formatTime = (dateStr: string) => {
    const diff = Math.max(Date.now() - new Date(dateStr).getTime(), 0);
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
  };

  // Group comments into top-level and replies
  const topLevelComments = realComments.filter(c => !c.parent_id);
  const repliesMap = new Map<string, SupaComment[]>();
  realComments.filter(c => c.parent_id).forEach(reply => {
    const parentId = reply.parent_id as string;
    if (!repliesMap.has(parentId)) repliesMap.set(parentId, []);
    repliesMap.get(parentId)!.push(reply);
  });

  const isCreatorLiked = (comment: SupaComment) => {
    return authorId && comment.likes?.includes(authorId);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-[60] sheet-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed bottom-0 left-0 right-0 z-[70] rounded-t-3xl overflow-hidden flex flex-col bg-white shadow-[0_-8px_30px_rgba(0,0,0,0.12)]"
            style={{ maxHeight: '80vh', minHeight: '60vh' }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1.5 rounded-full bg-gray-300" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 relative">
              <h3 className="text-base font-bold text-gray-900 w-full text-center">{totalComments.toLocaleString()} comments</h3>
              <button onClick={onClose} className="absolute right-4 p-1.5 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors">
                <X size={18} className="text-gray-600" />
              </button>
            </div>

            {/* Comments List */}
            <div ref={listRef} className="flex-1 overflow-y-auto no-scrollbar px-5 py-4 space-y-5">
              {loading && (
                <div className="flex items-center justify-center py-6">
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                    <Loader2 size={24} className="text-purple-600" />
                  </motion.div>
                </div>
              )}

              {/* Real Comments */}
              {topLevelComments.map((comment) => {
                const isMyComment = user?.id === comment.user_id;
                const creatorLiked = isCreatorLiked(comment);
                const hasReplies = repliesMap.get(comment.id) || [];

                return (
                  <div key={comment.id} className="group">
                    {/* Top Level Comment */}
                    <div className="flex gap-3">
                      <Avatar src={comment.avatar_url || `https://i.pravatar.cc/150?u=${comment.user_id}`} alt={comment.username} size="sm" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-purple-600 truncate">{comment.username}</span>
                          <span className="text-[10px] text-gray-400 shrink-0">{formatTime(comment.created_at)}</span>
                        </div>
                        
                        {/* Edit Mode vs Display Mode */}
                        {editingId === comment.id ? (
                          <div className="mt-1 flex gap-2">
                            <input
                              className="w-full text-sm p-1.5 border border-purple-200 rounded outline-none"
                              value={editDraft}
                              onChange={e => setEditDraft(e.target.value)}
                              autoFocus
                            />
                            <button onClick={() => handleEditSubmit(comment.id)} className="text-xs bg-purple-600 text-white px-3 rounded font-medium">Save</button>
                            <button onClick={() => setEditingId(null)} className="text-xs bg-gray-100 text-gray-600 px-3 rounded">Cancel</button>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-800 mt-0.5 leading-relaxed break-words pr-2">{comment.text}</p>
                        )}
                        
                        {/* Action Bar beneath comment */}
                        <div className="flex items-center gap-4 mt-2 relative">
                          <button 
                            className="text-[11px] text-gray-500 font-semibold hover:text-purple-600 transition-colors"
                            onClick={() => {
                              setReplyingTo({ id: comment.id, username: comment.username });
                              inputRef.current?.focus();
                            }}
                          >
                            Reply
                          </button>

                          {/* 3-dot menu for owner */}
                          {isMyComment && !editingId && (
                            <div className="relative">
                              <button onClick={() => setActiveMenuId(activeMenuId === comment.id ? null : comment.id)} className="text-gray-400 hover:text-gray-700 p-1">
                                <MoreHorizontal size={14} />
                              </button>
                              {activeMenuId === comment.id && (
                                <div className="absolute top-full left-0 mt-1 bg-white border border-gray-100 shadow-lg rounded-xl flex overflow-hidden z-10 w-28">
                                  <button 
                                    className="flex-1 flex items-center justify-center gap-1.5 p-2 text-[10px] font-semibold text-gray-600 hover:bg-gray-50 transition-colors border-r border-gray-100"
                                    onClick={() => { setEditDraft(comment.text); setEditingId(comment.id); setActiveMenuId(null); }}
                                  >
                                    <Edit2 size={12} /> Edit
                                  </button>
                                  <button 
                                    className="flex-1 flex items-center justify-center gap-1.5 p-2 text-[10px] font-semibold text-red-500 hover:bg-red-50 transition-colors"
                                    onClick={() => handleDelete(comment.id)}
                                  >
                                    <Trash2 size={12} /> Del
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Creator Liked Badge */}
                        {creatorLiked && (
                          <div className="mt-2 flex items-center gap-1 bg-gray-50 border border-gray-100 w-fit px-2 py-0.5 rounded-full">
                            <Avatar src="" alt="Creator" size="sm" />
                            <span className="text-[9px] text-gray-500 font-medium">Liked by creator</span>
                          </div>
                        )}
                      </div>

                      {/* Top-Right Like Button */}
                      <button className="flex flex-col items-center gap-1 pt-1 px-2 shrink-0" onClick={() => handleLikeComment(comment.id, true)}>
                        <Heart size={15} className={`transition-all ${likedComments.has(comment.id) ? 'fill-purple-600 text-purple-600 scale-110' : 'text-gray-400'}`} />
                        <span className={`text-[10px] font-medium ${likedComments.has(comment.id) ? 'text-purple-600' : 'text-gray-400'}`}>
                          {(comment.likes?.length || 0) + (likedComments.has(comment.id) ? 1 : 0)}
                        </span>
                      </button>
                    </div>

                    {/* Replies mapping */}
                    {hasReplies.length > 0 && (
                      <div className="ml-10 mt-3 space-y-4 border-l-2 border-gray-100 pl-4 py-1">
                        {hasReplies.map(reply => {
                          const isMyReply = user?.id === reply.user_id;
                          return (
                            <div key={reply.id} className="flex gap-3 relative">
                              <Avatar src={reply.avatar_url || `https://i.pravatar.cc/150?u=${reply.user_id}`} alt={reply.username} size="sm" />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-[11px] font-bold text-gray-800 truncate">{reply.username}</span>
                                  <span className="text-[9px] text-gray-400 shrink-0">{formatTime(reply.created_at)}</span>
                                </div>

                                {editingId === reply.id ? (
                                  <div className="mt-1 flex gap-2">
                                    <input className="w-full text-xs p-1.5 border border-purple-200 rounded outline-none" value={editDraft} onChange={e => setEditDraft(e.target.value)} autoFocus />
                                    <button onClick={() => handleEditSubmit(reply.id)} className="text-[10px] bg-purple-600 text-white px-2 rounded font-medium">Save</button>
                                  </div>
                                ) : (
                                  <p className="text-[13px] text-gray-800 mt-0.5 break-words pr-2">
                                    <span className="text-purple-600 font-semibold mr-1">@{comment.username}</span>
                                    {reply.text}
                                  </p>
                                )}

                                {/* Reply Action Bar */}
                                {isMyReply && !editingId && (
                                  <div className="flex items-center gap-3 mt-1.5 opacity-50 hover:opacity-100 transition-opacity">
                                    <button onClick={() => { setEditDraft(reply.text); setEditingId(reply.id); }} className="text-[10px] font-medium text-gray-500 hover:text-purple-600">Edit</button>
                                    <button onClick={() => handleDelete(reply.id)} className="text-[10px] font-medium text-red-400 hover:text-red-500">Delete</button>
                                  </div>
                                )}
                              </div>
                              <button className="flex flex-col items-center gap-0.5 pt-1 px-1 shrink-0" onClick={() => handleLikeComment(reply.id, true)}>
                                <Heart size={13} className={`transition-all ${likedComments.has(reply.id) ? 'fill-purple-600 text-purple-600' : 'text-gray-400'}`} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Input Footer */}
            <div className="border-t border-gray-100 bg-white">
              {replyingTo && (
                <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-100">
                  <span className="text-xs text-gray-600 font-medium">Replying to <span className="font-bold text-purple-600">@{replyingTo.username}</span></span>
                  <button onClick={() => setReplyingTo(null)} className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
                </div>
              )}
              <div className="flex items-center gap-3 px-4 py-3">
                <Avatar src={profile.avatar_url} alt="You" size="sm" />
                <div className="flex-1 flex items-center gap-2 bg-gray-100 rounded-full px-4 py-2">
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder={replyingTo ? 'Add a reply...' : 'Add a comment...'}
                    className="flex-1 bg-transparent text-[13px] outline-none text-gray-900 placeholder:text-gray-500"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendComment()}
                  />
                  <button
                    onClick={handleSendComment}
                    className={`transition-all ${newComment.trim() ? 'text-purple-600 hover:text-purple-700' : 'text-gray-400'}`}
                    disabled={!newComment.trim() || sending}
                  >
                    {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  </button>
                </div>
              </div>
            </div>
            <div className="h-[env(safe-area-inset-bottom)]" />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
