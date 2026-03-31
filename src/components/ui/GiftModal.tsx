'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Coins } from 'lucide-react';
import { GIFTS } from '@/lib/constants';
import { Gift } from '@/types';

interface GiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendGift: (gift: Gift) => void;
}

export default function GiftModal({ isOpen, onClose, onSendGift }: GiftModalProps) {
  const [selectedGift, setSelectedGift] = useState<Gift | null>(null);
  const [balance] = useState(5000);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-[60] sheet-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            className="fixed bottom-0 left-0 right-0 z-[70] rounded-t-3xl overflow-hidden"
            style={{ background: 'linear-gradient(to bottom, #1a1a2e, #0f0f1e)' }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pb-3">
              <h3 className="text-lg font-bold font-display">Send a Gift</h3>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-warning/15 text-warning text-sm font-semibold">
                  <Coins size={14} />
                  <span>{balance.toLocaleString()}</span>
                </div>
                <button onClick={onClose} className="p-1.5 rounded-full bg-glass">
                  <X size={18} className="text-text-secondary" />
                </button>
              </div>
            </div>

            {/* Gift Grid */}
            <div className="grid grid-cols-4 gap-2 px-4 pb-4 max-h-[280px] overflow-y-auto no-scrollbar">
              {GIFTS.map((gift) => (
                <motion.button
                  key={gift.id}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all ${
                    selectedGift?.id === gift.id
                      ? 'bg-primary/20 border border-primary/40 scale-105'
                      : 'bg-glass hover:bg-glass-strong'
                  }`}
                  onClick={() => setSelectedGift(gift)}
                  whileTap={{ scale: 0.9 }}
                >
                  <span className="text-3xl">{gift.icon}</span>
                  <span className="text-[10px] text-text-secondary font-medium">{gift.name}</span>
                  <span className="text-[10px] text-warning font-bold">{gift.cost}</span>
                </motion.button>
              ))}
            </div>

            {/* Send Button */}
            <div className="px-4 pb-6 pt-2">
              <motion.button
                className={`w-full py-3.5 rounded-2xl font-bold text-base transition-all ${
                  selectedGift
                    ? 'bg-gradient-to-r from-primary to-accent-light text-white shadow-lg shadow-primary/30'
                    : 'bg-surface-light text-text-secondary'
                }`}
                onClick={() => {
                  if (selectedGift) {
                    onSendGift(selectedGift);
                    onClose();
                  }
                }}
                whileTap={selectedGift ? { scale: 0.97 } : {}}
                disabled={!selectedGift}
              >
                {selectedGift ? `Send ${selectedGift.icon} ${selectedGift.name}` : 'Select a Gift'}
              </motion.button>
            </div>

            <div className="h-[env(safe-area-inset-bottom)]" />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
