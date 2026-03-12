import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import api from '../services/api';
import Layout from '../components/Layout';
import { FaSearch, FaPlay, FaCircleNotch } from 'react-icons/fa';

export default function Discover() {
    const router = useRouter();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);

    // Debounce search
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (query.trim()) {
                performSearch(query);
            } else {
                setResults([]);
                setHasSearched(false);
            }
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [query]);

    const performSearch = async (searchQuery: string) => {
        setLoading(true);
        setHasSearched(true);
        try {
            const res = await api.get(`/videos/search?q=${encodeURIComponent(searchQuery)}`);
            setResults(res.data);
        } catch (err) {
            console.error('Error searching videos:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleVideoClick = (videoId: string) => {
        router.push(`/?videoId=${videoId}`);
    };

    return (
        <Layout>
            <div className="min-h-screen bg-white text-black pt-4 md:pt-8 md:px-8">
                <div className="max-w-4xl mx-auto w-full">
                    {/* Search Header */}
                    <div className="sticky top-0 bg-white/95 backdrop-blur-md z-40 p-4 border-b border-gray-100 mb-6 rounded-b-xl shadow-sm md:rounded-xl md:border">
                        <div className="relative flex items-center">
                            <FaSearch className="absolute left-4 text-gray-400" />
                            <input
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Search for videos, topics, or trends..."
                                className="w-full bg-gray-100 text-black pl-11 pr-4 py-3 rounded-full outline-none focus:ring-2 focus:ring-pink-500/50 transition-all text-sm md:text-base"
                                autoFocus
                            />
                            {query && (
                                <button 
                                    onClick={() => setQuery('')}
                                    className="absolute right-4 text-gray-400 hover:text-gray-600 text-xl font-bold"
                                >
                                    &times;
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="px-4 md:px-0 pb-24">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-20 text-pink-500">
                                <FaCircleNotch className="animate-spin text-4xl mb-4" />
                                <p className="text-gray-500 font-medium">Searching...</p>
                            </div>
                        ) : !hasSearched ? (
                            <div className="flex flex-col items-center justify-center py-20 text-center">
                                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                    <FaSearch className="text-3xl text-gray-300" />
                                </div>
                                <h2 className="text-xl font-bold text-gray-800 mb-2">Discover New Content</h2>
                                <p className="text-gray-500 max-w-xs text-sm">
                                    Type a keyword above to find videos you'll love.
                                </p>
                            </div>
                        ) : results.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-center">
                                <span className="text-5xl mb-4">😕</span>
                                <h2 className="text-xl font-bold text-gray-800 mb-2">No results found</h2>
                                <p className="text-gray-500 text-sm">
                                    Try searching for different keywords.
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 md:gap-4">
                                {results.map((video: any) => (
                                    <div 
                                        key={video._id} 
                                        onClick={() => handleVideoClick(video._id)}
                                        className="relative aspect-[9/16] bg-black rounded-lg overflow-hidden group cursor-pointer shadow-sm hover:shadow-lg transition-shadow"
                                    >
                                        <video
                                            src={video.videoUrl.startsWith('http') ? video.videoUrl : `${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000'}${video.videoUrl}`}
                                            className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                                            muted
                                            playsInline
                                            onMouseOver={(e) => (e.target as HTMLVideoElement).play().catch(() => {})}
                                            onMouseOut={(e) => {
                                                const v = e.target as HTMLVideoElement;
                                                v.pause();
                                                v.currentTime = 0;
                                            }}
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                                            <p className="text-white text-xs font-bold line-clamp-2 shadow-black drop-shadow-md">
                                                {video.title}
                                            </p>
                                            <div className="flex items-center gap-1.5 mt-1.5">
                                                <div className="w-4 h-4 rounded-full bg-gray-300 overflow-hidden shrink-0">
                                                    {video.userId?.profilePic ? (
                                                        <img src={video.userId.profilePic} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full bg-pink-500"></div>
                                                    )}
                                                </div>
                                                <p className="text-gray-300 text-[10px] truncate shadow-black drop-shadow-md">
                                                    @{video.userId?.username}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="absolute top-2 right-2 md:hidden group-hover:flex bg-black/40 rounded-full p-1.5 backdrop-blur-sm hidden">
                                            <FaPlay className="text-white text-[10px] ml-0.5" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Layout>
    );
}
