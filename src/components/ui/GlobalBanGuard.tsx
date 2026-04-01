'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Ban, AlertOctagon } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/AuthContext';

export default function GlobalBanGuard() {
  const { user } = useAuth();
  const [isBanned, setIsBanned] = useState(false);
  const [banReason, setBanReason] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    let isSubscribed = true;
    const supabase = createClient();

    // Initial explicit check to set immediate state
    const checkBanStatus = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('is_banned, ban_reason')
        .eq('id', user.id)
        .single();
        
      if (!error && data && isSubscribed) {
        setIsBanned(data.is_banned);
        setBanReason(data.ban_reason);
      }
    };

    checkBanStatus();

    // Realtime Postgres listener for the user's specific row
    const channel = supabase.channel(`guard_status_${user.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` },
        (payload) => {
          if (isSubscribed) {
            setIsBanned(payload.new.is_banned);
            setBanReason(payload.new.ban_reason);
          }
        }
      )
      .subscribe();

    return () => {
      isSubscribed = false;
      supabase.removeChannel(channel);
    };
  }, [user]);

  if (!isBanned) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: '#000', zIndex: 9999, overflow: 'hidden',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column', color: '#fff', padding: '24px'
        }}
      >
        <motion.div 
          animate={{ scale: [1, 1.1, 1], rotate: [0, -5, 5, 0] }}
          transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
          style={{ 
            width: 100, height: 100, borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', 
            border: '2px solid #ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: '32px'
          }}
        >
          <AlertOctagon size={48} color="#ef4444" />
        </motion.div>

        <h1 style={{ fontSize: '2.5rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 12px', color: '#ef4444', textAlign: 'center' }}>
          Account Suspended
        </h1>
        
        <p style={{ fontSize: '1.1rem', color: '#a3a3a3', maxWidth: '500px', textAlign: 'center', lineHeight: '1.6', marginBottom: '32px' }}>
          Your access to the Skipsee platform has been permanently restricted by Omajanwba Administration due to a violation of our terms of service.
        </p>

        <div style={{ background: '#111', padding: '24px', borderRadius: '16px', border: '1px solid #222', width: '100%', maxWidth: '500px' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
            Official Suspension Reason
          </div>
          <div style={{ fontSize: '1rem', color: '#fff', lineHeight: '1.5', fontWeight: 500 }}>
            "{banReason || 'Repeated community guideline violations.'}"
          </div>
        </div>

        <div style={{ marginTop: '48px', fontSize: '0.85rem', color: '#666', textAlign: 'center' }}>
          This action is final. Contact Omajanwba security if you believe this is an error.
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
