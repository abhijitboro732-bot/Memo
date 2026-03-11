import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import api from '../../services/api';
import Layout from '../../components/Layout';
import { FaUserCircle, FaCamera, FaTrash, FaPlay, FaEllipsisV } from 'react-icons/fa';
import ImageCropper from '../../components/ImageCropper';
import ChatWindow from '../../components/ChatWindow';
import SupportModal from '../../components/SupportModal';

export default function Profile() {
    const router = useRouter();
    const { id } = router.query;
    const [profileUser, setProfileUser] = useState<any>(null);
    const [userVideos, setUserVideos] = useState<any[]>([]);
    const [isFollowing, setIsFollowing] = useState(false);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [isCropping, setIsCropping] = useState(false);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [showSupportModal, setShowSupportModal] = useState(false);
    const fileInputRef = useState<any>(null);

    useEffect(() => {
        const savedUser = localStorage.getItem('user');
        if (savedUser) {
            setCurrentUser(JSON.parse(savedUser));
        }
    }, []);

    useEffect(() => {
        if (id) fetchProfile();
    }, [id, currentUser]);

    const fetchProfile = async () => {
        try {
            const res = await api.get(`/users/${id}`);
            setProfileUser(res.data);

            const videoRes = await api.get(`/videos/user/${id}`);
            setUserVideos(videoRes.data);

            if (currentUser && res.data.followers.includes(currentUser.id)) {
                setIsFollowing(true);
            }
        } catch (err) {
            console.error('Error fetching profile', err);
        }
    };

    const handleFollow = async () => {
        if (!currentUser) return router.push('/login');

        // Optimistic update
        setIsFollowing(!isFollowing);

        try {
            if (isFollowing) {
                await api.put(`/users/unfollow/${id}`);
            } else {
                await api.put(`/users/follow/${id}`);
            }
            fetchProfile(); // Refresh counts
        } catch (err) {
            console.error('Error toggling follow', err);
            setIsFollowing(!isFollowing); // Revert
        }
    };

    const handleMessage = () => {
        if (!currentUser) return router.push('/login');
        setIsChatOpen(true);
    };

    const handleDeleteVideo = async (videoId: string) => {
        if (!confirm('Are you sure you want to delete this video?')) return;

        try {
            await api.delete(`/videos/${videoId}`);
            setUserVideos(prev => prev.filter(v => v._id !== videoId));
        } catch (err) {
            console.error('Error deleting video', err);
            alert('Failed to delete video');
        }
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setSelectedImage(e.target.files[0]);
            setIsCropping(true);
        }
        e.target.value = ''; // Reset input
    };

    const handleSaveCroppedImage = async (croppedBlob: Blob) => {
        setIsCropping(false);
        const formData = new FormData();
        formData.append('image', croppedBlob, 'profile.jpg');

        try {
            const res = await api.post('/users/upload-profile-pic', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            // Update UI
            setProfileUser({ ...profileUser, profilePic: res.data.profilePic });

            // Update local storage if it's the current user
            if (currentUser && currentUser.id === id) {
                const updatedUser = { ...currentUser, profilePic: res.data.profilePic };
                localStorage.setItem('user', JSON.stringify(updatedUser));
                setCurrentUser(updatedUser);
            }
        } catch (err) {
            console.error('Error uploading profile picture', err);
            alert('Failed to upload profile picture');
        }
    };

    if (!profileUser) return <Layout><div className="text-white p-4">Loading...</div></Layout>;

    return (
        <Layout>
            <div className="p-4 text-black bg-white min-h-screen">
                <div className="flex flex-col items-center mb-8 relative">
                    
                    {/* Top Right Settings / Support Menu for Current User */}
                    {currentUser && currentUser.id === id && (
                        <button 
                            onClick={() => setShowSupportModal(true)}
                            className="absolute top-0 right-0 p-3 text-gray-500 hover:text-gray-800 transition-colors"
                            title="Help & Support"
                        >
                            <FaEllipsisV size={20} />
                        </button>
                    )}

                    <div className="relative group cursor-pointer mt-4" onClick={() => currentUser && currentUser.id === id && document.getElementById('profilePicInput')?.click()}>
                        {profileUser.profilePic ? (
                            <img src={profileUser.profilePic} alt={profileUser.username} className="w-24 h-24 rounded-full mb-2 object-cover border-4 border-pink-100" />
                        ) : (
                            <FaUserCircle size={96} className="text-gray-300 mb-2 border-4 border-transparent" />
                        )}

                        {/* Overlay for editing (only show if it's the current user's profile) */}
                        {currentUser && currentUser.id === id && (
                            <div className="absolute inset-0 bg-black/50 rounded-full flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity mb-2">
                                <FaCamera size={24} className="text-white mb-1" />
                                <span className="text-white text-xs font-bold">Edit</span>
                            </div>
                        )}
                    </div>

                    <input
                        type="file"
                        id="profilePicInput"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageChange}
                    />

                    <h1 className="text-2xl font-bold">@{profileUser.username}</h1>

                    <div className="flex gap-6 mt-4">
                        <div className="text-center">
                            <span className="font-bold block text-lg">{profileUser.following.length}</span>
                            <span className="text-xs text-gray-500 uppercase tracking-wide">Following</span>
                        </div>
                        <div className="text-center">
                            <span className="font-bold block text-lg">{profileUser.followers.length}</span>
                            <span className="text-xs text-gray-500 uppercase tracking-wide">Followers</span>
                        </div>
                        <div className="text-center">
                            <span className="font-bold block text-lg">0</span>
                            <span className="text-xs text-gray-500 uppercase tracking-wide">Likes</span>
                        </div>
                        <div className="text-center">
                            <button onClick={handleMessage} className="text-2xl text-gray-600 hover:text-pink-500">
                                ✉️
                            </button>
                            <span className="text-xs text-gray-500 uppercase tracking-wide block">Message</span>
                        </div>
                    </div>

                    {currentUser && currentUser.id !== profileUser._id && (
                        <div className="flex gap-3 mt-6 w-full max-w-xs">
                            <button
                                onClick={handleFollow}
                                className={`flex-1 py-2 px-4 rounded font-bold transition-colors ${isFollowing
                                    ? 'bg-gray-200 text-black hover:bg-gray-300'
                                    : 'bg-pink-500 text-white hover:bg-pink-600'
                                    }`}
                            >
                                {isFollowing ? 'Following' : 'Follow'}
                            </button>
                            <button
                                onClick={handleMessage}
                                className="flex-1 py-2 px-4 rounded font-bold bg-gray-200 text-black hover:bg-gray-300 transition-colors"
                            >
                                Message
                            </button>
                        </div>
                    )}
                </div>

                <div className="border-t border-gray-200 pt-4">
                    <h2 className="font-bold mb-4 text-gray-800">Videos ({userVideos.length})</h2>
                    <div className="grid grid-cols-3 gap-1">
                        {userVideos.length === 0 ? (
                            <div className="col-span-3 py-8 text-center text-gray-400 text-sm">
                                No videos uploaded yet
                            </div>
                        ) : (
                            userVideos.map(video => (
                                <div key={video._id} className="aspect-[9/16] bg-black relative group cursor-pointer overflow-hidden" onClick={() => window.open(`/?videoId=${video._id}`, '_self')}>
                                    <video
                                        src={video.videoUrl.startsWith('http') ? video.videoUrl : `${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000'}${video.videoUrl}`}
                                        className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                                        <FaPlay className="text-white text-2xl drop-shadow-md" />
                                    </div>

                                    {currentUser && currentUser.id === id && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteVideo(video._id);
                                            }}
                                            className="absolute top-2 right-2 p-2 bg-red-500/80 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all z-10"
                                            title="Delete Video"
                                        >
                                            <FaTrash size={12} />
                                        </button>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {isCropping && selectedImage && (
                <ImageCropper
                    image={selectedImage}
                    onClose={() => setIsCropping(false)}
                    onSave={handleSaveCroppedImage}
                />
            )}

            {isChatOpen && currentUser && profileUser && (
                <ChatWindow
                    receiverId={profileUser._id || id}
                    receiverName={profileUser.username}
                    receiverPic={profileUser.profilePic}
                    onClose={() => setIsChatOpen(false)}
                />
            )}

            {showSupportModal && (
                <SupportModal onClose={() => setShowSupportModal(false)} />
            )}
        </Layout>
    );
}
