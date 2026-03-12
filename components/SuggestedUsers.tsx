import { useEffect, useState } from 'react';
import api from '../services/api';
import { FaUserPlus, FaUserCircle } from 'react-icons/fa';
import Link from 'next/link';
import { useRouter } from 'next/router';

export default function SuggestedUsers() {
    const [users, setUsers] = useState<any[]>([]);
    const [loadingMap, setLoadingMap] = useState<{ [key: string]: boolean }>({});
    const router = useRouter();

    useEffect(() => {
        const fetchSuggestions = async () => {
            const token = localStorage.getItem('token');
            if (!token) return; // Don't fetch if not logged in

            try {
                const res = await api.get('/users/suggestions');
                setUsers(res.data);
            } catch (err: any) {
                if (err.response && (err.response.status === 400 || err.response.status === 401)) {
                    // Token is likely invalid or expired. Clear it.
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                }
                console.log('Error fetching suggestions (suppressed from UI)');
            }
        };
        fetchSuggestions();
    }, []);

    const handleFollow = async (userId: string) => {
        const currentUserStr = localStorage.getItem('user');
        if (!currentUserStr) return router.push('/login');

        setLoadingMap(prev => ({ ...prev, [userId]: true }));

        try {
            await api.put(`/users/follow/${userId}`);
            // Remove user from suggestions after following
            setUsers(users.filter(u => u._id !== userId));
        } catch (err) {
            console.error('Error following user', err);
        } finally {
            setLoadingMap(prev => ({ ...prev, [userId]: false }));
        }
    };

    return (
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <h3 className="font-bold text-gray-700 mb-4">Suggested for you</h3>

            {users.length === 0 ? (
                <div className="text-gray-500 text-sm text-center py-4">
                    No suggestions right now. Keep exploring!
                </div>
            ) : (
                <div className="space-y-4">
                    {users.map(user => (
                        <div key={user._id} className="flex items-center justify-between group">
                            <Link href={`/profile/${user._id}`} className="flex items-center gap-2 hover:opacity-80 transition-opacity flex-1 overflow-hidden">
                                {user.profilePic ? (
                                    <img src={user.profilePic} className="w-10 h-10 rounded-full object-cover shrink-0" />
                                ) : (
                                    <FaUserCircle size={40} className="text-gray-300 shrink-0" />
                                )}
                                <div className="truncate pr-2">
                                    <p className="font-bold text-sm text-black truncate">{user.username}</p>
                                    <p className="text-xs text-gray-500">{user.followers.length} followers</p>
                                </div>
                            </Link>

                            <button
                                onClick={() => handleFollow(user._id)}
                                disabled={loadingMap[user._id]}
                                className="text-pink-600 font-semibold text-sm hover:text-pink-800 transition-colors disabled:opacity-50 shrink-0 bg-pink-50 hover:bg-pink-100 px-3 py-1.5 rounded-full"
                            >
                                {loadingMap[user._id] ? 'Wait...' : 'Follow'}
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
