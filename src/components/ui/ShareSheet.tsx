'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Search, Check, Loader2 } from 'lucide-react';
import Avatar from './Avatar';
import { useAuth } from '@/lib/AuthContext';
import { fetchRealUsers, searchRealUsers } from '@/lib/supabase/users';
import { sendMessage } from '@/lib/supabase/messaging';
import type { User, Video } from '@/types';

interface ShareSheetProps {
  isOpen: boolean;
  onClose: () => void;
  video: Video | null;
}

export default function ShareSheet({ isOpen, onClose, video }: ShareSheetProps) {
  const { user, openAuthModal } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [sentTo, setSentTo] = useState<Set<string>>(new Set());
  const [sendingTo, setSendingTo] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSentTo(new Set()); // Reset sent status when opened
      setLoading(true);
      fetchRealUsers(20).then(data => {
        // Filter out the current user
        setUsers(data.filter(u => u.id !== user?.id));
        setLoading(false);
      });
    }
  }, [isOpen, user?.id]);

  useEffect(() => {
    if (!isOpen) return;
    const delay = setTimeout(() => {
      if (searchQuery.trim()) {
        setLoading(true);
        searchRealUsers(searchQuery.trim(), 20).then(data => {
          setUsers(data.filter(u => u.id !== user?.id));
          setLoading(false);
        });
      } else {
        fetchRealUsers(20).then(data => {
          setUsers(data.filter(u => u.id !== user?.id));
          setLoading(false);
        });
      }
    }, 400);
    return () => clearTimeout(delay);
  }, [searchQuery, isOpen, user?.id]);

  const handleSend = async (receiverId: string) => {
    if (!user) {
      openAuthModal();
      return;
    }
    if (!video) return;

    setSendingTo(receiverId);
    
    // Create the specialized reel message payload
    const payload = `reel::${video.id}::${video.thumbnail_url || ''}`;
    
    const result = await sendMessage(user.id, receiverId, payload);
    
    if (result) {
      setSentTo(prev => {
        const next = new Set(prev);
        next.add(receiverId);
        return next;
      });
    }
    setSendingTo(null);
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
            style={{ maxHeight: '70vh', minHeight: '50vh' }}
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
              <h3 className="text-base font-bold text-gray-900 w-full text-center">Share to</h3>
              <button onClick={onClose} className="absolute right-4 p-1.5 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors">
                <X size={18} className="text-gray-600" />
              </button>
            </div>

            {/* Search Bar */}
            <div className="p-4 border-b border-gray-50">
              <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-4 py-2">
                <Search size={16} className="text-gray-400" />
                <input
                  type="text"
                  placeholder="Search users..."
                  className="flex-1 bg-transparent text-sm outline-none text-gray-900 placeholder:text-gray-500"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Users List */}
            <div className="flex-1 overflow-y-auto no-scrollbar px-2 py-2">
              {loading && users.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 size={24} className="text-purple-600 animate-spin" />
                </div>
              ) : users.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">
                  No users found
                </div>
              ) : (
                <div className="space-y-1">
                  {users.map(u => {
                    const isSent = sentTo.has(u.id);
                    const isSending = sendingTo === u.id;
                    
                    return (
                      <div key={u.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition-colors">
                        <div className="flex items-center gap-3">
                          <Avatar src={u.avatar_url} alt={u.username} size="md" />
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-gray-900">{u.display_name}</span>
                            <span className="text-xs text-gray-500">@{u.username}</span>
                          </div>
                        </div>
                        
                        <button
                          onClick={() => !isSent && handleSend(u.id)}
                          disabled={isSent || isSending}
                          className={`flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
                            isSent 
                              ? 'bg-gray-100 text-gray-500' // Sent state
                              : 'bg-purple-600 text-white hover:bg-purple-700 active:scale-95 shadow-sm'
                          }`}
                          style={{ minWidth: 80 }}
                        >
                          {isSending ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : isSent ? (
                            <>Sent <Check size={14} /></>
                          ) : (
                            'Send'
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="h-[env(safe-area-inset-bottom)]" />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
