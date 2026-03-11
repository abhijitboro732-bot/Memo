import { FaUserCircle, FaCommentDots } from 'react-icons/fa';
import Link from 'next/link';

interface FollowingListProps {
    following: any[];
    onMessage: (user: any) => void;
}

export default function FollowingList({ following, onMessage }: FollowingListProps) {
    if (!following || following.length === 0) return null;

    return (
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <h3 className="font-bold text-gray-700 mb-4">Following</h3>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                {following.map((user: any) => (
                    <div key={user._id} className="flex items-center justify-between">
                        <Link href={`/profile/${user._id}`} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                            {user.profilePic ? (
                                <img src={user.profilePic} className="w-10 h-10 rounded-full object-cover" />
                            ) : (
                                <FaUserCircle size={40} className="text-gray-300" />
                            )}
                            <div>
                                <p className="font-bold text-sm text-black truncate max-w-[100px]">{user.username}</p>
                            </div>
                        </Link>
                        <button
                            onClick={() => onMessage(user)}
                            className="bg-gray-100 hover:bg-gray-200 text-black px-3 py-1.5 rounded-full text-xs font-bold transition-colors flex items-center gap-1"
                        >
                            <span>Message</span>
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
