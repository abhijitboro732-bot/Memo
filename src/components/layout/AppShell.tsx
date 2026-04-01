'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import LeftSidebar from './LeftSidebar';
import BottomNav from './BottomNav';
import TopNavbar from './TopNavbar';
import StoryBar from './StoryBar';
import { AuthProvider } from '@/lib/AuthContext';
import { ProfileProvider } from '@/lib/ProfileContext';
import { UploadProvider } from '@/lib/UploadContext';
import { LiveProvider } from '@/lib/LiveContext';
import UploadModal from '../ui/UploadModal';
import AuthModal from '../ui/AuthModal';
import GlobalBanGuard from '../ui/GlobalBanGuard';
import AdminRedirectGuard from '../ui/AdminRedirectGuard';

interface AppShellProps {
  children: React.ReactNode;
}

const FULLSCREEN_ROUTES = ['/live/broadcast', '/omajanwba'];

export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const isHomeFeed = pathname === '/';
  const isFullscreen = FULLSCREEN_ROUTES.some(r => pathname.startsWith(r));

  if (isFullscreen) {
    return (
      <AuthProvider>
        <GlobalBanGuard />
        <AdminRedirectGuard />
        <ProfileProvider>
          <LiveProvider>
            <UploadProvider>
              {children}
            </UploadProvider>
          </LiveProvider>
        </ProfileProvider>
      </AuthProvider>
    );
  }

  return (
    <AuthProvider>
      <GlobalBanGuard />
      <AdminRedirectGuard />
      <ProfileProvider>
        <LiveProvider>
          <UploadProvider>
            {/* Desktop Layout */}
            <div className="hidden lg:flex flex-col min-h-screen">
              <TopNavbar />
              {isHomeFeed && <StoryBar />}
              <div className="flex flex-1">
                <LeftSidebar />
                <div className="flex-1 flex justify-center">
                  <div className={`flex-1 ${isHomeFeed ? '' : 'max-w-[800px]'} w-full`}>
                    {children}
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile Layout */}
            <div className="lg:hidden">
              <main className="pb-16">
                {children}
              </main>
              <BottomNav />
            </div>

            {/* Modals */}
            <UploadModal />
            <AuthModal />
          </UploadProvider>
        </LiveProvider>
      </ProfileProvider>
    </AuthProvider>
  );
}
