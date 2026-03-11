import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { FaHeart, FaComment, FaShare, FaExclamationTriangle } from 'react-icons/fa';
import api from '../services/api';
import CommentsSection from './CommentsSection';
import ShareModal from './ShareModal';

interface VideoProps {
    video: any;
    isActive: boolean;
}

export default function VideoCard({ video, isActive }: VideoProps) {
    const [liked, setLiked] = useState(false);
    const [likesCount, setLikesCount] = useState(video.likes.length);
    const [showComments, setShowComments] = useState(false);
    const [showShare, setShowShare] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const startTimeRef = useRef<number>(0);

    useEffect(() => {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            const user = JSON.parse(userStr);
            if (video.likes.includes(user.id) || video.likes.includes(user._id)) {
                setLiked(true);
            }
        }
    }, [video.likes]);

    useEffect(() => {
        if (isActive && !showComments && !showShare) {
            videoRef.current?.play().catch(err => console.log('Autoplay prevented:', err));
            // Record when the user started watching
            startTimeRef.current = Date.now();
        } else {
            videoRef.current?.pause();

            // Log interaction when video is no longer active but was being watched
            if (startTimeRef.current > 0) {
                const watchTimeSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000);
                
                // Only log if they watched at least a little bit (e.g. 1 second)
                if (watchTimeSeconds >= 1) {
                    api.post('/videos/interaction', {
                        videoId: video._id,
                        type: 'view',
                        watchTime: watchTimeSeconds
                    }).catch(err => console.error('Failed to log watch time:', err));
                }
                
                // Reset timer wrapper
                startTimeRef.current = 0;
            }

            if (videoRef.current && !showComments && !showShare) videoRef.current.currentTime = 0;
        }
    }, [isActive, showComments, showShare, video._id]);

    const handleLike = async () => {
        // Optimistic Update
        const previousLiked = liked;
        const previousCount = likesCount;
        setLiked(!liked);
        setLikesCount(liked ? likesCount - 1 : likesCount + 1);

        try {
            await api.put(`/videos/like/${video._id}`);
        } catch (err) {
            console.error('Error liking video', err);
            // Revert checks
            setLiked(previousLiked);
            setLikesCount(previousCount);
        }
    };

    const handleReport = async () => {
        const reason = window.prompt("Why are you reporting this video?");
        if (reason && reason.trim()) {
            try {
                const res = await api.post(`/videos/report/${video._id}`, { reason });
                alert(res.data.message || 'Video reported successfully.');
            } catch (err: any) {
                console.error('Error reporting video:', err);
                alert(err.response?.data?.message || 'Failed to report video.');
            }
        }
    };

    return (
        <div className="relative h-full w-full flex items-center justify-center bg-black snap-start">
            <video
                ref={videoRef}
                src={video.videoUrl.startsWith('http') ? video.videoUrl : `${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')}${video.videoUrl}`}
                className="h-full w-full object-cover"
                controls
                loop
                muted
                playsInline
            />

            {/* Gradient Overlay for Text Readability */}
            <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-black/80 to-transparent pointer-events-none"></div>

            {/* Top Left Logo */}
            <div className="absolute top-4 left-4 z-20 pointer-events-none drop-shadow-md flex items-center gap-2">
                <Image src="/favicon.png" alt="Meemo Logo" width={28} height={28} className="rounded-full shadow-sm bg-white/20 p-0.5" />
                <span className="text-2xl font-extrabold text-pink-500 tracking-tight drop-shadow-lg shadow-black">Meemo</span>
            </div>

            {/* Overlay Info */}
            <div className="absolute bottom-6 left-4 right-16 text-white z-10 drop-shadow-md">
                <h3 className="font-bold text-lg">@{video.userId?.username || 'user'}</h3>
                <p className="text-sm text-gray-200">{video.description}</p>
            </div>

            {/* Action Buttons */}
            <div className="absolute bottom-10 right-2 flex flex-col gap-6 items-center z-20">
                <div className="flex flex-col items-center">
                    <button
                        onClick={handleLike}
                        className={`p-3 rounded-full bg-gray-800/60 backdrop-blur-sm ${liked ? 'text-red-500' : 'text-white'} hover:bg-gray-700/60 transition-colors`}
                    >
                        <FaHeart size={24} />
                    </button>
                    <span className="text-xs mt-1 text-white font-medium drop-shadow-md">{likesCount}</span>
                </div>

                <div className="flex flex-col items-center">
                    <button
                        onClick={() => {
                            setShowComments(true);
                            api.post('/videos/interaction', { videoId: video._id, type: 'comment' }).catch(err => console.log(err));
                        }}
                        className="p-3 rounded-full bg-gray-800/60 backdrop-blur-sm text-white hover:bg-gray-700/60 transition-colors"
                    >
                        <FaComment size={24} />
                    </button>
                    <span className="text-xs mt-1 text-white font-medium drop-shadow-md">{video.comments.length}</span>
                </div>

                <button 
                    onClick={() => {
                        setShowShare(true);
                        api.post('/videos/interaction', { videoId: video._id, type: 'share' }).catch(err => console.log(err));
                    }}
                    className="p-3 rounded-full bg-gray-800/60 backdrop-blur-sm text-white hover:bg-gray-700/60 transition-colors"
                >
                    <FaShare size={24} />
                </button>

                <button 
                    onClick={handleReport}
                    className="p-3 rounded-full bg-gray-800/60 backdrop-blur-sm text-gray-400 hover:text-red-500 hover:bg-gray-700/60 transition-colors"
                    title="Report"
                >
                    <FaExclamationTriangle size={20} />
                </button>
            </div>

            {/* Comments Overlay */}
            {showComments && (
                <CommentsSection
                    videoId={video._id}
                    initialComments={video.comments}
                    onClose={() => setShowComments(false)}
                />
            )}

            {/* Share Overlay */}
            {showShare && (
                <ShareModal 
                    video={video} 
                    onClose={() => setShowShare(false)} 
                />
            )}
        </div>
    );
}
