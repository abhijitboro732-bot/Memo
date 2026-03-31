'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldAlert, Users, Video, Activity, LayoutDashboard, Settings, LogOut, Search, Flag, Trash2, Ban, MessageSquareWarning } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { formatCount } from '@/lib/constants';
import Avatar from '@/components/ui/Avatar';
import { createClient } from '@/lib/supabase/client';
import {
  AdminUser, AdminVideo, Report, checkIsAdmin,
  fetchAdminUsers, adminBanUser,
  fetchAdminVideos, adminDeleteVideo,
  fetchReports, resolveReport, sendAdminWarning
} from '@/lib/supabase/admin';
import {
  fetchAdminSupportConversations, fetchAdminConversationHistory,
  sendAdminSupportMessage, markSupportAsRead, SupportConversation, SupportMessage
} from '@/lib/supabase/support';

export default function OmajanwbaDashboard() {
  const router = useRouter();
  const { user, isLoading: authLoading, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'videos' | 'reports' | 'support'>('overview');
  
  // Data state
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [adminVideos, setAdminVideos] = useState<AdminVideo[]>([]);
  const [adminReports, setAdminReports] = useState<Report[]>([]);
  
  // Support state
  const [supportConvos, setSupportConvos] = useState<SupportConversation[]>([]);
  const [activeSupportUserId, setActiveSupportUserId] = useState<string | null>(null);
  const [activeSupportChat, setActiveSupportChat] = useState<SupportMessage[]>([]);
  const [adminReplyText, setAdminReplyText] = useState('');
  
  // Modals / Actions
  const [warningModalOpen, setWarningModalOpen] = useState(false);
  const [warningTargetUserId, setWarningTargetUserId] = useState('');
  const [warningMessage, setWarningMessage] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Ban Modal
  const [banModalOpen, setBanModalOpen] = useState(false);
  const [banTargetUserId, setBanTargetUserId] = useState('');
  const [banReason, setBanReason] = useState('');

  // Mock initial stats for overview (In real production, these would be fetched dynamically)
  const stats = [
    { label: 'Total Accounts', value: adminUsers.length || 0, icon: Users, color: '#3b82f6', trend: 'Live' },
    { label: 'Platform Videos', value: adminVideos.length || 0, icon: Video, color: '#10b981', trend: 'Live' },
    { label: 'Active Reports', value: adminReports.filter(r => r.status === 'pending').length || 0, icon: Flag, color: '#ef4444', trend: 'Live' },
  ];

  // Primary check & data load
  useEffect(() => {
    // If AuthContext finished loading and user is null, bounce immediately.
    if (!authLoading && !user) {
      router.replace('/omajanwba/login');
      return;
    }
    // Wait for user to populate
    if (!user) return;

    let isSubscribed = true;
    
    const init = async () => {
      const isAdmin = await checkIsAdmin(user.id);
      if (!isAdmin) {
        alert('SECURITY EXCEPTION: UNAUTHORIZED ACCOUNT.');
        await signOut();
        router.replace('/omajanwba/login');
        return;
      }

      // Initial Fetch
      const [u, v, r, c] = await Promise.all([
        fetchAdminUsers(),
        fetchAdminVideos(),
        fetchReports(),
        fetchAdminSupportConversations()
      ]);
      
      if (!isSubscribed) return;
      setAdminUsers(u);
      setAdminVideos(v);
      setAdminReports(r);
      setSupportConvos(c);
      setLoading(false);
    };

    init();

    // Setup Supabase Realtime subscriptions
    const supabase = createClient();
    const subProfiles = supabase.channel('admin_profiles')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        fetchAdminUsers().then(res => isSubscribed && setAdminUsers(res));
      }).subscribe();
      
    const subVideos = supabase.channel('admin_videos')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'videos' }, () => {
        fetchAdminVideos().then(res => isSubscribed && setAdminVideos(res));
      }).subscribe();

    const subSupport = supabase.channel('admin_support')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_messages' }, () => {
        fetchAdminSupportConversations().then(res => isSubscribed && setSupportConvos(res));
      }).subscribe();

    const subReports = supabase.channel('admin_reports')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reports' }, () => {
        fetchReports().then(res => isSubscribed && setAdminReports(res));
      }).subscribe();

    return () => {
      isSubscribed = false;
      supabase.removeChannel(subProfiles);
      supabase.removeChannel(subVideos);
      supabase.removeChannel(subReports);
      supabase.removeChannel(subSupport);
    };
  }, [user, authLoading, router, signOut]);

  // Actions
  const handleLogout = async () => {
    await signOut();
    router.push('/omajanwba/login');
  };

  const handleOpenBanModal = (userId: string) => {
    setBanTargetUserId(userId);
    setBanReason('');
    setBanModalOpen(true);
  };

  const handleExecuteBan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!banReason.trim()) return;
    setActionLoading(true);
    await adminBanUser(banTargetUserId, true, banReason.trim());
    setBanModalOpen(false);
    setActionLoading(false);
  };

  const handleExecuteUnban = async (id: string) => {
    if (!confirm('Pardon this user and fully restore their access?')) return;
    setActionLoading(true);
    await adminBanUser(id, false);
    setActionLoading(false);
  };

  const handleDeleteVideo = async (id: string) => {
    if (!confirm('Are you absolutely sure you want to permanently delete this video?')) return;
    setActionLoading(true);
    await adminDeleteVideo(id);
    setActionLoading(false);
  };

  const handleUpdateReport = async (id: string, newStatus: 'resolved' | 'dismissed') => {
    setActionLoading(true);
    await resolveReport(id, newStatus);
    setActionLoading(false);
  };

  const handleOpenWarning = (userId: string) => {
    setWarningTargetUserId(userId);
    setWarningMessage('');
    setWarningModalOpen(true);
  };

  const handleSendWarning = async () => {
    if (!warningMessage.trim() || !user) return;
    setActionLoading(true);
    await sendAdminWarning(user.id, warningTargetUserId, warningMessage.trim());
    setWarningModalOpen(false);
    setActionLoading(false);
    alert('Warning sent securely to user inbox.');
  };

  if (!user || loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0a' }}>
        <div style={{ width: 48, height: 48, borderRadius: '12px', background: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'pulse 1.5s infinite'}}>
          <ShieldAlert size={28} color="#fff" />
        </div>
        <style>{`@keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.8; transform: scale(1.05); } }`}</style>
      </div>
    );
  }

  const TabButton = ({ id, icon: Icon, label }: { id: any, icon: any, label: string }) => (
    <button
      onClick={() => setActiveTab(id)}
      style={{
        display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '10px',
        border: 'none', background: activeTab === id ? 'rgba(99,102,241,0.1)' : 'transparent',
        color: activeTab === id ? '#818cf8' : '#888',
        fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left'
      }}
    >
      <Icon size={18} /> {label}
    </button>
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0a0a0a', fontFamily: "'Inter', sans-serif", color: '#fff' }}>
      
      {/* Sidebar */}
      <div style={{ width: '260px', background: '#111', borderRight: '1px solid #222', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid #222' }}>
          <div style={{ width: 32, height: 32, borderRadius: '8px', background: 'linear-gradient(135deg, #6366f1, #3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldAlert size={18} color="#fff" />
          </div>
          <span style={{ fontSize: '1.2rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#fff' }}>Omajanwba</span>
        </div>

        <nav style={{ flex: 1, padding: '20px 12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <TabButton id="overview" icon={LayoutDashboard} label="Command Center" />
          <TabButton id="reports" icon={Flag} label="Reports Inbox" />
          <TabButton id="support" icon={MessageSquareWarning} label="Support Inbox" />
          <TabButton id="users" icon={Users} label="Accounts Directory" />
          <TabButton id="videos" icon={Video} label="Content Pipeline" />

          <button style={{
            display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '10px',
            border: 'none', background: 'transparent', color: '#888',
            fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left', marginTop: 'auto'
          }}>
            <Settings size={18} /> Settings
          </button>
        </nav>

        <div style={{ padding: '20px', borderTop: '1px solid #222' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#e5e5e5' }}>Session ID: ADMIN_{user.id.substring(0,6)}</span>
            </div>
            <button onClick={handleLogout} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}>
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflowY: 'auto', background: '#050505', position: 'relative' }}>
        
        {/* Warning Modal Overlay */}
        {warningModalOpen && (
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: '400px', background: '#111', border: '1px solid #333', borderRadius: '16px', padding: '24px' }}>
              <h3 style={{ marginTop: 0, fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                <MessageSquareWarning color="#f59e0b" size={20} /> Transmit Official Warning
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#888', marginBottom: '16px' }}>
                This message will be delivered directly into the user's primary chat inbox as a system alert.
              </p>
              <textarea 
                rows={4} 
                value={warningMessage}
                onChange={e => setWarningMessage(e.target.value)}
                placeholder="Declare the terms of their violation..."
                style={{ width: '100%', padding: '12px', background: '#000', border: '1px solid #333', color: '#fff', borderRadius: '8px', fontSize: '0.9rem', resize: 'none', marginBottom: '16px', boxSizing: 'border-box' }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button onClick={() => setWarningModalOpen(false)} style={{ padding: '8px 16px', background: 'transparent', color: '#888', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
                <button disabled={actionLoading} onClick={handleSendWarning} style={{ padding: '8px 16px', background: '#f59e0b', color: '#000', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 700 }}>Dispatch Warning</button>
              </div>
            </div>
          </div>
        )}

        <header style={{ padding: '24px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #1a1a1a' }}>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 700, margin: 0, color: '#e5e5e5' }}>
            {activeTab === 'overview' ? 'Overview' : activeTab === 'support' ? 'Support Inbox' : activeTab === 'reports' ? 'Incoming Reports' : activeTab === 'users' ? 'User Directory' : 'Content Grid'}
          </h2>
        </header>

        <main style={{ padding: '40px', flex: 1 }}>
          
          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
              {stats.map(s => (
                <div key={s.label} style={{ background: '#111', padding: '24px', borderRadius: '16px', border: '1px solid #1f1f1f' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                    <div style={{ width: 44, height: 44, borderRadius: '10px', background: `${s.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><s.icon size={20} color={s.color} /></div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '4px 8px', borderRadius: '20px' }}>{s.trend}</span>
                  </div>
                  <p style={{ fontSize: '0.9rem', color: '#888', margin: '0 0 8px', fontWeight: 600 }}>{s.label}</p>
                  <h3 style={{ fontSize: '2rem', fontWeight: 800, color: '#fff', margin: 0 }}>{formatCount(s.value)}</h3>
                </div>
              ))}
            </div>
          )}

          {/* REPORTS TAB */}
          {activeTab === 'reports' && (
            <div style={{ background: '#111', borderRadius: '16px', border: '1px solid #222', overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 2fr 1.5fr', padding: '16px 24px', borderBottom: '1px solid #222', color: '#888', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                <span>Action Required</span>
                <span>Status</span>
                <span>Context / Reason</span>
                <span style={{ textAlign: 'right' }}>Admin Resolution</span>
              </div>
              {adminReports.length === 0 ? <p style={{ padding: '24px', textAlign: 'center', color: '#666', fontSize: '0.9rem' }}>No reports pending.</p> : null}
              {adminReports.map(report => (
                <div key={report.id} style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 2fr 1.5fr', padding: '20px 24px', borderBottom: '1px solid #1a1a1a', alignItems: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Target: @{report.targeted_user?.username || 'unknown'}</span>
                    <span style={{ fontSize: '0.75rem', color: '#666' }}>ID: {report.targeted_user_id.substring(0,8)}...</span>
                  </div>
                  <div>
                    <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600, 
                      background: report.status === 'pending' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)', 
                      color: report.status === 'pending' ? '#ef4444' : '#10b981' }}>
                      {report.status}
                    </span>
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#e5e5e5' }}>"{report.reason}"</p>
                    <span style={{ fontSize: '0.7rem', color: '#666' }}>Reported by: @{report.reporter?.username || 'anon'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <button disabled={actionLoading} onClick={() => handleOpenWarning(report.targeted_user_id)} style={{ padding: '6px 12px', borderRadius: '6px', background: '#3b82f6', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, opacity: actionLoading ? 0.5 : 1 }}>Warn</button>
                    {report.status === 'pending' && <button disabled={actionLoading} onClick={() => handleUpdateReport(report.id, 'dismissed')} style={{ padding: '6px 12px', borderRadius: '6px', background: '#222', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, opacity: actionLoading ? 0.5 : 1 }}>Dismiss</button>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* SUPPORT INBOX TAB */}
          {activeTab === 'support' && (
            <div style={{ display: 'flex', height: '600px', background: '#111', borderRadius: '16px', border: '1px solid #222', overflow: 'hidden' }}>
              {/* Sidebar with conversations */}
              <div style={{ width: '300px', borderRight: '1px solid #222', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '16px', borderBottom: '1px solid #222', fontWeight: 700 }}>Open Support Tickets</div>
                <div style={{ flex: 1, overflowY: 'auto' }}>
                  {supportConvos.length === 0 && <div style={{ padding: 20, color: '#666', fontSize: '0.85rem', textAlign: 'center' }}>No active tickets</div>}
                  {supportConvos.map(c => (
                    <button
                      key={c.user_id}
                      onClick={async () => {
                        setActiveSupportUserId(c.user_id);
                        const msgs = await fetchAdminConversationHistory(c.user_id);
                        setActiveSupportChat(msgs);
                        if (c.unreadCount > 0) {
                          await markSupportAsRead(c.user_id);
                          const updatedConvos = await fetchAdminSupportConversations();
                          setSupportConvos(updatedConvos);
                        }
                      }}
                      style={{
                        width: '100%', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px',
                        background: activeSupportUserId === c.user_id ? '#1a1a1a' : 'transparent', border: 'none', borderBottom: '1px solid #1a1a1a',
                        textAlign: 'left', cursor: 'pointer', transition: 'background 0.2s'
                      }}
                    >
                      <div style={{ position: 'relative' }}>
                        <img src={c.user?.avatar_url || 'https://via.placeholder.com/40'} alt="" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
                        {c.unreadCount > 0 && <div style={{ position: 'absolute', top: -2, right: -2, width: 12, height: 12, background: '#ef4444', borderRadius: '50%' }} />}
                      </div>
                      <div style={{ flex: 1, overflow: 'hidden' }}>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.user?.display_name || 'User'}</div>
                        <div style={{ fontSize: '0.75rem', color: '#888', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.lastMessage.text}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Chat View */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#050505' }}>
                {!activeSupportUserId ? (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666', flexDirection: 'column', gap: '12px' }}>
                    <MessageSquareWarning size={48} color="#333" />
                    <span>Select a ticket to begin securely assisting users.</span>
                  </div>
                ) : (
                  <>
                    <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {activeSupportChat.map(msg => (
                        <div key={msg.id} style={{ display: 'flex', justifyContent: msg.is_from_admin ? 'flex-end' : 'flex-start' }}>
                          <div style={{
                            maxWidth: '70%', padding: '12px 16px', borderRadius: '16px',
                            borderBottomRightRadius: msg.is_from_admin ? '4px' : '16px',
                            borderBottomLeftRadius: msg.is_from_admin ? '16px' : '4px',
                            background: msg.is_from_admin ? '#3b82f6' : '#222',
                            color: '#fff', fontSize: '0.9rem'
                          }}>
                            {msg.text}
                          </div>
                        </div>
                      ))}
                    </div>
                    <form 
                      onSubmit={async e => {
                        e.preventDefault();
                        if (!adminReplyText.trim() || !user || !activeSupportUserId) return;
                        setActionLoading(true);
                        await sendAdminSupportMessage(user.id, activeSupportUserId, adminReplyText.trim());
                        setAdminReplyText('');
                        const msgs = await fetchAdminConversationHistory(activeSupportUserId);
                        setActiveSupportChat(msgs);
                        setActionLoading(false);
                      }}
                      style={{ padding: '16px', borderTop: '1px solid #222', background: '#111', display: 'flex', gap: '12px' }}
                    >
                      <input 
                        type="text" 
                        value={adminReplyText} 
                        onChange={e => setAdminReplyText(e.target.value)}
                        placeholder="Type an official admin response..."
                        disabled={actionLoading}
                        style={{ flex: 1, padding: '12px 20px', borderRadius: '24px', background: '#000', border: '1px solid #333', color: '#fff', outline: 'none' }}
                      />
                      <button type="submit" disabled={!adminReplyText.trim() || actionLoading} style={{ padding: '12px 24px', borderRadius: '24px', background: '#3b82f6', color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer', opacity: (!adminReplyText.trim() || actionLoading) ? 0.5 : 1 }}>
                        Send
                      </button>
                    </form>
                  </>
                )}
              </div>
            </div>
          )}

          {/* USERS TAB */}
          {activeTab === 'users' && (
            <div style={{ background: '#111', borderRadius: '16px', border: '1px solid #222', overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1.5fr 1fr', padding: '16px 24px', borderBottom: '1px solid #222', color: '#888', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                <span>Account Identity</span>
                <span>Joined Date</span>
                <span>Status</span>
                <span style={{ textAlign: 'right' }}>Controls</span>
              </div>
              {adminUsers.map(u => (
                <div key={u.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1.5fr 1fr', padding: '20px 24px', borderBottom: '1px solid #1a1a1a', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Avatar src={u.avatar_url} size="md" alt={u.username} />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{u.display_name || u.username} {u.is_omajanwba_admin && <span style={{ color: '#f59e0b', fontSize: '0.7rem' }}>(Admin)</span>}</span>
                      <span style={{ fontSize: '0.8rem', color: '#666' }}>@{u.username}</span>
                    </div>
                  </div>
                  <div><span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#e5e5e5' }}>{new Date(u.created_at).toLocaleDateString()}</span></div>
                  <div>
                    {u.is_banned ? 
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <span style={{ padding: '4px 10px', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', fontSize: '0.75rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4, width: 'fit-content' }}><Ban size={12}/> Suspended</span>
                        <span style={{ fontSize: '0.7rem', color: '#ff8a8a', fontStyle: 'italic', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>"{u.ban_reason}"</span>
                      </div> : 
                      <span style={{ padding: '4px 10px', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', fontSize: '0.75rem', fontWeight: 600 }}>Active</span>
                    }
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <button disabled={actionLoading} onClick={() => handleOpenWarning(u.id)} style={{ padding: '6px 12px', borderRadius: '6px', background: '#3b82f6', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, opacity: actionLoading ? 0.5 : 1 }}>Message</button>
                    {!u.is_omajanwba_admin && (
                      <button disabled={actionLoading} onClick={() => u.is_banned ? handleExecuteUnban(u.id) : handleOpenBanModal(u.id)} style={{ padding: '6px 12px', borderRadius: '6px', background: u.is_banned ? '#222' : '#ef4444', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, opacity: actionLoading ? 0.5 : 1 }}>
                        {u.is_banned ? 'Unban' : 'Suspend'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* VIDEOS TAB */}
          {activeTab === 'videos' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px' }}>
              {adminVideos.map(v => (
                <div key={v.id} style={{ background: '#111', borderRadius: '12px', overflow: 'hidden', border: '1px solid #222', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ aspectRatio: '9/16', position: 'relative', background: '#000' }}>
                    <a href={`/video/${v.id}`} target="_blank" rel="noopener noreferrer" style={{ display: 'block', width: '100%', height: '100%' }}>
                      <img src={v.thumbnail_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </a>
                    <button 
                      disabled={actionLoading}
                      onClick={() => handleDeleteVideo(v.id)}
                      style={{ position: 'absolute', top: 12, right: 12, width: 32, height: 32, borderRadius: '8px', background: 'rgba(239, 68, 68, 0.9)', border: 'none', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', opacity: actionLoading ? 0.5 : 1, transition: 'transform 0.1s' }}
                      onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
                      onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div style={{ padding: '12px' }}>
                    <p style={{ margin: '0 0 8px', fontSize: '0.85rem', color: '#e5e5e5', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v.caption}</p>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.75rem', color: '#888' }}>@{v.user?.username || 'unknown'}</span>
                      <span style={{ fontSize: '0.75rem', color: '#666', fontWeight: 600 }}>{formatCount(v.views_count)} views</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

        </main>
      </div>

      {/* Ban Reason Modal */}
      {banModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#111', padding: '32px', borderRadius: '16px', border: '1px solid #333', width: '100%', maxWidth: '400px' }}>
            <h3 style={{ margin: '0 0 16px', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Ban size={20} /> Establish Suspension
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#888', marginBottom: '24px' }}>
              This will instantly lock the user out of the application. The reason you type below will be permanently displayed on their screen indefinitely.
            </p>
            <form onSubmit={handleExecuteBan}>
              <textarea 
                value={banReason}
                onChange={e => setBanReason(e.target.value)}
                placeholder="Required exact reason for ban (e.g. 'Spamming explicit content on videos')..."
                required
                style={{ width: '100%', minHeight: '120px', background: '#000', border: '1px solid #333', borderRadius: '12px', padding: '16px', color: '#fff', outline: 'none', marginBottom: '16px', resize: 'none' }}
              />
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setBanModalOpen(false)} style={{ padding: '10px 16px', background: 'transparent', color: '#888', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
                <button type="submit" disabled={!banReason.trim() || actionLoading} style={{ padding: '10px 24px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, opacity: (!banReason.trim() || actionLoading) ? 0.5 : 1 }}>
                  Execute Ban
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
