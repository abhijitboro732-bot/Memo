'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useAuth } from './AuthContext';

interface UploadContextType {
  isUploadOpen: boolean;
  openUpload: () => void;
  closeUpload: () => void;
}

const UploadContext = createContext<UploadContextType>({
  isUploadOpen: false,
  openUpload: () => {},
  closeUpload: () => {},
});

export function UploadProvider({ children }: { children: ReactNode }) {
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const { user, openAuthModal } = useAuth();

  const openUpload = () => {
    if (!user) {
      // Not logged in — show auth modal instead
      openAuthModal();
      return;
    }
    setIsUploadOpen(true);
  };

  return (
    <UploadContext.Provider
      value={{
        isUploadOpen,
        openUpload,
        closeUpload: () => setIsUploadOpen(false),
      }}
    >
      {children}
    </UploadContext.Provider>
  );
}

export function useUpload() {
  return useContext(UploadContext);
}
