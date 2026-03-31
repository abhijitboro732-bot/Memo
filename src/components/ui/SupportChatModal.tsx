'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShieldAlert, Send } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { fetchUserSupportMessages, sendUserSupportMessage, SupportMessage } from '@/lib/supabase/support';

interface SupportChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SupportChatModal({ isOpen, onClose }: SupportChatModalProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || !user) return;

    let isSubscribed = true;
    
    // Initial fetch
    fetchUserSupportMessages(user.id).then(res => {
      if (isSubscribed) setMessages(res);
      // scroll to bottom
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }, 100);
    });

    const supabase = createClient();
    const channel = supabase.channel('support_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_messages', filter: `user_id=eq.${user.id}` }, () => {
        fetchUserSupportMessages(user.id).then(res => {
          if (isSubscribed) setMessages(res);
          setTimeout(() => {
            if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
          }, 100);
        });
      })
      .subscribe();

    return () => {
      isSubscribed = false;
      supabase.removeChannel(channel);
    };
  }, [isOpen, user]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !user || loading) return;
    
    setLoading(true);
    const sent = await sendUserSupportMessage(user.id, inputText.trim());
    if (sent) setInputText('');
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.8)', zIndex: 1000,
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center'
        }}
      >
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          onClick={e => e.stopPropagation()}
          style={{
            width: '100%', maxWidth: '600px', height: '80vh',
            background: '#0a0a0a', borderTopLeftRadius: '24px', borderTopRightRadius: '24px',
            border: '1px solid #222', display: 'flex', flexDirection: 'column', overflow: 'hidden'
          }}
        >
          {/* Header */}
          <div style={{ padding: '20px', borderBottom: '1px solid #222', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#111' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ShieldAlert size={20} color="#fff" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '1rem', fontWeight: 700, color: '#fff' }}>Omajanwba Security</span>
                <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>Official Support</span>
              </div>
            </div>
            <button onClick={onClose} style={{ background: '#222', border: 'none', width: 36, height: 36, borderRadius: '50%', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <X size={18} />
            </button>
          </div>

          {/* Chat History */}
          <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', background: '#050505' }}>
            <div style={{ textAlign: 'center', margin: '20px 0' }}>
              <span style={{ fontSize: '0.75rem', background: '#1a1a1a', padding: '6px 12px', borderRadius: '20px', color: '#888' }}>
                This is a secure connection established with Omajanwba Administration. State your inquiry.
              </span>
            </div>
            {messages.map(msg => {
              const isAdmin = msg.is_from_admin;
              return (
                <div key={msg.id} style={{ display: 'flex', justifyContent: isAdmin ? 'flex-start' : 'flex-end' }}>
                  <div style={{
                    maxWidth: '75%', padding: '12px 16px', borderRadius: '18px',
                    borderBottomLeftRadius: isAdmin ? '4px' : '18px',
                    borderBottomRightRadius: isAdmin ? '18px' : '4px',
                    background: isAdmin ? 'var(--input-bg)' : '#3b82f6',
                    color: '#fff', fontSize: '0.9rem', lineHeight: '1.4'
                  }}>
                    {msg.text}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Input Area */}
          <div style={{ padding: '16px', borderTop: '1px solid #222', background: '#111' }}>
            <form onSubmit={handleSend} style={{ display: 'flex', gap: '12px' }}>
              <input
                type="text"
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                placeholder="Type your message to Support..."
                style={{
                  flex: 1, padding: '14px 20px', borderRadius: '30px', border: '1px solid #333',
                  background: '#0a0a0a', color: '#fff', fontSize: '0.9rem', outline: 'none'
                }}
              />
              <button 
                type="submit" 
                disabled={loading || !inputText.trim()}
                style={{
                  width: 48, height: 48, borderRadius: '50%', border: 'none',
                  background: inputText.trim() ? '#3b82f6' : '#222', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: inputText.trim() ? 'pointer' : 'default',
                  transition: 'background 0.2s'
                }}
              >
                <Send size={18} />
              </button>
            </form>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
