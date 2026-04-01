'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { CURRENT_USER } from './constants';

import { createClient } from './supabase/client';

interface ProfileData {
  display_name: string;
  username: string;
  bio: string;
  avatar_url: string;
  website_url: string;
}

interface ProfileContextType {
  profile: ProfileData;
  updateProfile: (data: Partial<ProfileData>) => Promise<void>;
}

const defaultProfile: ProfileData = {
  display_name: CURRENT_USER.display_name,
  username: CURRENT_USER.username,
  bio: CURRENT_USER.bio,
  avatar_url: CURRENT_USER.avatar_url,
  website_url: '',
};

const ProfileContext = createContext<ProfileContextType>({
  profile: defaultProfile,
  updateProfile: async () => {},
});

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  // Always start with default values (matches server render)
  const [profile, setProfile] = useState<ProfileData>(defaultProfile);
  const [hydrated, setHydrated] = useState(false);

  // Load from localStorage AFTER hydration to avoid mismatch
  useEffect(() => {
    const saved = localStorage.getItem('skipsee_profile');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setProfile(parsed);
      } catch {}
    }
    setHydrated(true);
  }, []);

  // Load user metadata from Supabase auth if available
  useEffect(() => {
    if (user?.user_metadata && hydrated) {
      const meta = user.user_metadata;
      
      // Fetch fresh profile from database as definitive truth since it may have website_url not in metadata
      const fetchProfile = async () => {
        const supabase = createClient();
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (data) {
          setProfile(prev => ({
            ...prev,
            display_name: data.display_name || meta.display_name || meta.username || prev.display_name,
            username: data.username || meta.username || prev.username,
            avatar_url: data.avatar_url || meta.avatar_url || prev.avatar_url,
            bio: data.bio || prev.bio,
            website_url: data.website_url || prev.website_url,
          }));
        } else {
          // Fallback to metadata
          setProfile(prev => ({
            ...prev,
            display_name: meta.display_name || meta.username || prev.display_name,
            username: meta.username || prev.username,
            avatar_url: meta.avatar_url || prev.avatar_url,
          }));
        }
      };
      fetchProfile();
    }
  }, [user, hydrated]);

  // Save profile to localStorage whenever it changes (after hydration)
  useEffect(() => {
    if (hydrated) {
      localStorage.setItem('skipsee_profile', JSON.stringify(profile));
    }
  }, [profile, hydrated]);

  const updateProfile = async (data: Partial<ProfileData>) => {
    // 1. Optimistic Local Update
    setProfile(prev => ({ ...prev, ...data }));
    
    // 2. Transmit to Supabase (if authenticated)
    if (user) {
      const supabase = createClient();
      await supabase.from('profiles').update({
        display_name: data.display_name,
        bio: data.bio,
        avatar_url: data.avatar_url,
        website_url: data.website_url,
      }).eq('id', user.id);
    }
  };

  return (
    <ProfileContext.Provider value={{ profile, updateProfile }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  return useContext(ProfileContext);
}
