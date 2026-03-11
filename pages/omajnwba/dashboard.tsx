import { useEffect, useState } from 'react';
import api from '../../services/api';
import { useRouter } from 'next/router';
import { FaPlay, FaSignOutAlt, FaReply, FaCheck } from 'react-icons/fa';

export default function AdminDashboard() {
    const [activeTab, setActiveTab] = useState('users'); // users, videos, tickets, reports
    const [users, setUsers] = useState([]);
    const [videos, setVideos] = useState([]);
    const [tickets, setTickets] = useState<any[]>([]);
    const [reports, setReports] = useState<any[]>([]);
    const [replyingTo, setReplyingTo] = useState<string | null>(null);
    const [warningTo, setWarningTo] = useState<string | null>(null);
    const [adminReply, setAdminReply] = useState('');
    const [warningMessage, setWarningMessage] = useState('');
    const router = useRouter();

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('adminUser') || '{}');
        if (!user.isAdmin) {
            router.push('/omajnwba/login');
            return;
        }
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const usersRes = await api.get('/admin/users');
            setUsers(usersRes.data);
            const videosRes = await api.get('/admin/videos');
            setVideos(videosRes.data);
            const ticketsRes = await api.get('/admin/support');
            setTickets(ticketsRes.data);
            const reportsRes = await api.get('/admin/reports');
            setReports(reportsRes.data);
        } catch (err) {
            console.error('Error fetching admin data', err);
        }
    };

    const deleteUser = async (id: string) => {
        if (!confirm('Are you sure?')) return;
        try {
            await api.delete(`/admin/users/${id}`);
            fetchData();
        } catch (err) {
            alert('Failed to delete user');
        }
    };

    const deleteVideo = async (id: string) => {
        if (!confirm('Are you sure?')) return;
        try {
            await api.delete(`/admin/videos/${id}`);
            fetchData();
        } catch (err) {
            alert('Failed to delete video');
        }
    }

    const handleReplyTicket = async (ticketId: string) => {
        if (!adminReply.trim()) return;
        try {
            await api.put(`/admin/support/${ticketId}`, { adminReply });
            setReplyingTo(null);
            setAdminReply('');
            fetchData();
            alert('Reply sent successfully');
        } catch (err) {
            alert('Failed to send reply');
        }
    };

    const handleWarnUser = async (reportId: string) => {
        if (!warningMessage.trim()) return;
        try {
            await api.post(`/admin/reports/${reportId}/warn`, { warningMessage });
            setWarningTo(null);
            setWarningMessage('');
            fetchData();
            alert('User warned successfully');
        } catch (err) {
            alert('Failed to warn user');
        }
    };

    const logout = () => {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
        router.push('/omajnwba/login');
    };

    return (
        <div className="min-h-screen bg-gray-900 p-0 sm:p-6 md:p-10">
            <div className="max-w-4xl mx-auto bg-gray-800 min-h-screen sm:min-h-[80vh] shadow-2xl p-4 sm:p-6 text-white sm:rounded-lg border-y sm:border border-gray-700">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 border-b border-gray-700 pb-4">
                    <h1 className="text-3xl font-bold text-pink-500">Super Omajanwba Dashboard</h1>
                    <button onClick={logout} className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded text-sm transition font-bold">
                        <FaSignOutAlt /> Logout
                    </button>
                </div>

                <div className="flex gap-4 mb-6 border-b border-gray-700 pb-2 overflow-x-auto">
                    <button onClick={() => setActiveTab('users')} className={`pb-2 font-bold transition-colors shrink-0 ${activeTab === 'users' ? 'text-pink-500 border-b-2 border-pink-500' : 'text-gray-400 hover:text-gray-200'}`}>Users</button>
                    <button onClick={() => setActiveTab('videos')} className={`pb-2 font-bold transition-colors shrink-0 ${activeTab === 'videos' ? 'text-pink-500 border-b-2 border-pink-500' : 'text-gray-400 hover:text-gray-200'}`}>Videos</button>
                    <button onClick={() => setActiveTab('tickets')} className={`pb-2 font-bold transition-colors shrink-0 whitespace-nowrap ${activeTab === 'tickets' ? 'text-pink-500 border-b-2 border-pink-500' : 'text-gray-400 hover:text-gray-200'}`}>
                        Customer Care
                        {tickets.filter(t => t.status === 'open').length > 0 && (
                            <span className="ml-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{tickets.filter(t => t.status === 'open').length}</span>
                        )}
                    </button>
                    <button onClick={() => setActiveTab('reports')} className={`pb-2 font-bold transition-colors shrink-0 whitespace-nowrap ${activeTab === 'reports' ? 'text-pink-500 border-b-2 border-pink-500' : 'text-gray-400 hover:text-gray-200'}`}>
                        Reports
                        {reports.filter(r => r.status === 'pending').length > 0 && (
                            <span className="ml-2 bg-yellow-500 text-black text-xs px-2 py-0.5 rounded-full">{reports.filter(r => r.status === 'pending').length}</span>
                        )}
                    </button>
                </div>

                {activeTab === 'users' && (
                    <div className="mb-8">
                        <h2 className="text-xl font-bold mb-4">Users ({users.length})</h2>
                        <div className="space-y-2">
                            {users.map((user: any) => (
                                <div key={user._id} className="bg-gray-800 p-3 rounded flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-4 border border-gray-700">
                                    <div className="w-full">
                                        <p className="font-bold truncate">{user.username}</p>
                                        <p className="text-xs text-gray-400 truncate w-full">{user.email}</p>
                                    </div>
                                    <button onClick={() => deleteUser(user._id)} className="text-red-500 text-sm hover:underline shrink-0">Ban</button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'videos' && (
                    <div>
                        <h2 className="text-xl font-bold mb-4">Videos ({videos.length})</h2>
                        <div className="space-y-2">
                            {videos.map((video: any) => (
                                <div key={video._id} className="bg-gray-800 p-3 rounded flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border border-gray-700 hover:border-pink-500/50 transition">
                                    <div className="flex gap-4 items-center w-full">
                                        <div className="w-16 h-24 bg-black rounded overflow-hidden relative shrink-0" onClick={() => window.open(`/?videoId=${video._id}`, '_self')}>
                                            <video
                                                src={video.videoUrl.startsWith('http') ? video.videoUrl : `${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000'}${video.videoUrl}`}
                                                className="w-full h-full object-cover opacity-80 cursor-pointer"
                                            />
                                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                <FaPlay className="text-white drop-shadow-md text-xs" />
                                            </div>
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="font-bold truncate">{video.title}</p>
                                            <p className="text-xs text-gray-400 truncate w-full">by {video.userId?.username}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => deleteVideo(video._id)} className="text-red-500 text-sm hover:underline shrink-0">Delete</button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'tickets' && (
                    <div>
                        <h2 className="text-xl font-bold mb-4">Support Tickets</h2>
                        <div className="space-y-4">
                            {tickets.length === 0 ? (
                                <p className="text-gray-400 py-4">No support tickets.</p>
                            ) : (
                                tickets.map((ticket: any) => (
                                    <div key={ticket._id} className={`bg-gray-800 p-4 rounded-lg flex flex-col gap-3 border ${ticket.status === 'resolved' ? 'border-green-500/30' : 'border-gray-600'}`}>
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-bold text-sm text-pink-400">@{ticket.userId?.username}</p>
                                                <p className="text-xs text-gray-400 mt-1">{new Date(ticket.createdAt).toLocaleString()}</p>
                                            </div>
                                            <span className={`text-xs px-2 py-1 rounded font-bold ${ticket.status === 'resolved' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                                {ticket.status.toUpperCase()}
                                            </span>
                                        </div>
                                        
                                        <div className="bg-gray-700/50 p-3 rounded text-sm text-gray-200 border-l-4 border-pink-500">
                                            {ticket.message}
                                        </div>

                                        {ticket.adminReply ? (
                                            <div className="bg-gray-900/50 p-3 rounded text-sm text-gray-300 border-l-4 border-blue-500 ml-4 relative">
                                                <FaCheck className="absolute -left-3 -top-2 text-blue-500 bg-gray-800 rounded-full p-0.5" />
                                                <span className="font-bold text-blue-400 block mb-1 text-xs">Omajanwba Reply:</span>
                                                {ticket.adminReply}
                                            </div>
                                        ) : (
                                            <div className="ml-4 flex flex-col gap-2 mt-2">
                                                {replyingTo === ticket._id ? (
                                                    <div className="flex flex-col gap-2">
                                                        <textarea 
                                                            className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-sm outline-none focus:border-blue-500"
                                                            placeholder="Type your reply to the user..."
                                                            rows={3}
                                                            value={adminReply}
                                                            onChange={(e) => setAdminReply(e.target.value)}
                                                        />
                                                        <div className="flex justify-end gap-2">
                                                            <button 
                                                                onClick={() => { setReplyingTo(null); setAdminReply(''); }}
                                                                className="text-xs px-3 py-1.5 rounded hover:bg-gray-700 transition"
                                                            >
                                                                Cancel
                                                            </button>
                                                            <button 
                                                                onClick={() => handleReplyTicket(ticket._id)}
                                                                className="text-xs px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 font-bold transition disabled:bg-gray-600 text-white"
                                                                disabled={!adminReply.trim()}
                                                            >
                                                                Send Reply
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <button 
                                                        onClick={() => setReplyingTo(ticket._id)}
                                                        className="self-start flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition"
                                                    >
                                                        <FaReply size={12} /> Reply to User
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'reports' && (
                    <div>
                        <h2 className="text-xl font-bold mb-4">Content Reports</h2>
                        <div className="space-y-4">
                            {reports.length === 0 ? (
                                <p className="text-gray-400 py-4">No reports.</p>
                            ) : (
                                reports.map((report: any) => (
                                    <div key={report._id} className={`bg-gray-800 p-4 rounded-lg flex flex-col gap-3 border ${report.status === 'resolved' ? 'border-green-500/30' : 'border-yellow-500/50'}`}>
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-bold text-sm text-yellow-500">Video Report</p>
                                                <p className="text-xs text-gray-400 mt-1">Reported by @{report.userId?.username}</p>
                                            </div>
                                            <span className={`text-xs px-2 py-1 rounded font-bold ${report.status === 'resolved' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-500'}`}>
                                                {report.status.toUpperCase()}
                                            </span>
                                        </div>
                                        
                                        <div className="bg-gray-700/50 p-3 rounded text-sm text-white">
                                            <span className="font-bold block mb-1">Reason:</span>
                                            {report.reason}
                                        </div>

                                        {report.videoId && (
                                           <div className="flex gap-4 items-center bg-black/40 p-2 rounded w-full">
                                                <div className="w-12 h-16 bg-black rounded overflow-hidden relative shrink-0 cursor-pointer" onClick={() => window.open(`/?videoId=${report.videoId._id}`, '_self')}>
                                                    <video
                                                        src={report.videoId.videoUrl.startsWith('http') ? report.videoId.videoUrl : `${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000'}${report.videoId.videoUrl}`}
                                                        className="w-full h-full object-cover opacity-80"
                                                    />
                                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                        <FaPlay className="text-white drop-shadow-md text-[10px]" />
                                                    </div>
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="font-bold text-sm truncate">{report.videoId.title}</p>
                                                    <p className="text-xs text-red-400 truncate mt-1">Author: @{report.videoId.userId?.username}</p>
                                                </div>
                                                <button onClick={() => deleteVideo(report.videoId._id)} className="text-red-500 text-xs px-2 py-1 border border-red-500 rounded hover:bg-red-500 hover:text-white transition">Delete Video</button>
                                            </div> 
                                        )}

                                        {!report.videoId ? (
                                            <span className="text-xs text-gray-500 mt-2">Video has already been deleted.</span>
                                        ) : report.status !== 'resolved' ? (
                                            <div className="mt-2 text-right border-t border-gray-700 pt-3">
                                                {warningTo === report._id ? (
                                                    <div className="flex flex-col gap-2">
                                                        <textarea 
                                                            className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-sm outline-none focus:border-red-500"
                                                            placeholder="Type warning message to send to the author..."
                                                            rows={2}
                                                            value={warningMessage}
                                                            onChange={(e) => setWarningMessage(e.target.value)}
                                                        />
                                                        <div className="flex justify-end gap-2">
                                                            <button 
                                                                onClick={() => { setWarningTo(null); setWarningMessage(''); }}
                                                                className="text-xs px-3 py-1.5 rounded hover:bg-gray-700 transition"
                                                            >
                                                                Cancel
                                                            </button>
                                                            <button 
                                                                onClick={() => handleWarnUser(report._id)}
                                                                className="text-xs px-3 py-1.5 rounded bg-red-600 hover:bg-red-500 font-bold transition disabled:bg-gray-600 text-white"
                                                                disabled={!warningMessage.trim()}
                                                            >
                                                                Send Warning
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <button 
                                                        onClick={() => setWarningTo(report._id)}
                                                        className="text-red-400 hover:text-red-300 transition text-sm font-bold flex items-center justify-end gap-1 w-full"
                                                    >
                                                        ⚠ Warn Author: @{report.videoId.userId?.username}
                                                    </button>
                                                )}
                                            </div>
                                        ) : null}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
