'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/AuthContext';

export default function AdminRedirectGuard() {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!user) return;

    let isSubscribed = true;
    const supabase = createClient();

    const checkAdminStatus = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('is_omajanwba_admin')
        .eq('id', user.id)
        .single();
        
      if (!error && data && isSubscribed) {
        setIsAdmin(!!data.is_omajanwba_admin);
      }
    };

    checkAdminStatus();

    const channel = supabase.channel(`admin_status_${user.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` },
        (payload) => {
          if (isSubscribed) {
            setIsAdmin(!!payload.new.is_omajanwba_admin);
          }
        }
      )
      .subscribe();

    return () => {
      isSubscribed = false;
      supabase.removeChannel(channel);
    };
  }, [user]);

  useEffect(() => {
    // If user is an admin, and they are not on the admin portal dashboard or its auth pages,
    // force redirect them.
    if (isAdmin && pathname && !pathname.startsWith('/omajanwba')) {
      router.replace('/omajanwba');
    }
  }, [isAdmin, pathname, router]);

  // This is a strictly logical component, so it renders nothing.
  return null;
}
