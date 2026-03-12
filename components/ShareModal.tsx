import { useState, useEffect } from 'react';
import { FaTimes, FaUserCircle, FaPaperPlane } from 'react-icons/fa';
import api from '../services/api';

interface ShareModalProps {
    video: any;
    onClose: () => void;
}

export default function ShareModal({ video, onClose }: ShareModalProps) {
    const [following, setFollowing] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [sentStatus, setSentStatus] = useState<{ [key: string]: boolean }>({});
    const [sending, setSending] = useState<{ [key: string]: boolean }>({});

    useEffect(() => {
        const fetchFriends = async () => {
            const userStr = localStorage.getItem('user');
            if (userStr) {
                const user = JSON.parse(userStr);
                try {
                    const res = await api.get(`/users/${user.id || user._id}`);
                    setFollowing(res.data.following || []);
                } catch (err) {
                    console.error('Error fetching following list for share', err);
                }
            }
            setLoading(false);
        };
        fetchFriends();
    }, []);

    const handleShare = async (friendId: string) => {
        setSending(prev => ({ ...prev, [friendId]: true }));

        try {
            const videoLink = `${window.location.origin}/?videoId=${video._id}`;

            const messageText = `Check out this reel! 🎥\n\n${video.description || 'Awesome video'}\n${videoLink}`;

            const formData = new FormData();
            formData.append('receiver', friendId);
            formData.append('text', messageText);
            formData.append('sharedVideo', video._id);

            await api.post('/chat/send', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setSentStatus(prev => ({ ...prev, [friendId]: true }));

            // Revert to Send button after 3 seconds so they see it succeeded
            setTimeout(() => {
                setSentStatus(prev => ({ ...prev, [friendId]: false }));
            }, 3000);

        } catch (err) {
            console.error('Error sharing video', err);
            alert('Failed to share video.');
        } finally {
            setSending(prev => ({ ...prev, [friendId]: false }));
        }
    };

    return (
        <div className="absolute inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm transition-opacity">
            <div className="w-full h-3/4 sm:h-auto sm:max-h-[80vh] sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col pt-2 transition-transform duration-300 transform translate-y-0 relative">

                {/* Modal Drag Indicator (Mobile) */}
                <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-2 sm:hidden" />

                {/* Header */}
                <div className="flex justify-between items-center px-6 pb-4 border-b border-gray-100">
                    <h3 className="font-bold text-lg text-gray-800">Share to...</h3>
                    <button onClick={onClose} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors">
                        <FaTimes className="text-gray-600" />
                    </button>
                </div>

                {/* Content List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {loading ? (
                        <div className="text-center text-gray-400 py-8">Loading friends...</div>
                    ) : following.length === 0 ? (
                        <div className="text-center text-gray-500 py-8 px-4">
                            You aren't following anyone yet. Follow people to share videos with them!
                        </div>
                    ) : (
                        following.map((user) => (
                            <div key={user._id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-xl transition-colors">
                                <div className="flex items-center gap-3">
                                    {user.profilePic ? (
                                        <img src={user.profilePic} className="w-12 h-12 rounded-full object-cover border border-gray-100 shadow-sm" alt={user.username} />
                                    ) : (
                                        <FaUserCircle size={48} className="text-gray-300" />
                                    )}
                                    <span className="font-bold text-gray-800">{user.username}</span>
                                </div>

                                <button
                                    onClick={() => handleShare(user._id)}
                                    disabled={sending[user._id] || sentStatus[user._id]}
                                    className={`px-4 py-2 rounded-full font-bold text-sm flex items-center gap-2 transition-all ${sentStatus[user._id]
                                        ? 'bg-green-100 text-green-600'
                                        : 'bg-pink-500 hover:bg-pink-600 text-white shadow-md hover:shadow-lg'
                                        }`}
                                >
                                    {sentStatus[user._id] ? (
                                        'Sent!'
                                    ) : sending[user._id] ? (
                                        'Sending...'
                                    ) : (
                                        <>
                                            Send <FaPaperPlane size={12} />
                                        </>
                                    )}
                                </button>
                            </div>
                        ))
                    )}
                </div>

                {/* Share Link Copy fallback */}
                <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-xl sm:rounded-b-3xl">
                    <button
                        onClick={() => {
                            const videoLink = `${window.location.origin}/?videoId=${video._id}`;
                            navigator.clipboard.writeText(videoLink);
                            alert('Link copied to clipboard!');
                        }}
                        className="w-full py-3 bg-white border border-gray-200 rounded-xl font-bold text-gray-700 hover:bg-gray-100 transition-colors shadow-sm"
                    >
                        Copy Video Link
                    </button>
                </div>
            </div>
        </div>
    );
}
