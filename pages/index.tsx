import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import api from '../services/api';
import Layout from '../components/Layout';
import VideoCard from '../components/VideoCard';
import SuggestedUsers from '../components/SuggestedUsers';
import FollowingList from '../components/FollowingList';
import ChatWindow from '../components/ChatWindow';

export default function Home() {
  const router = useRouter();
  const [videos, setVideos] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);

  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [chatReceiver, setChatReceiver] = useState<any>(null);
  const [initialVideoFetched, setInitialVideoFetched] = useState(false);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        try {
          const res = await api.get(`/users/${user.id || user._id}`);
          setCurrentUser(res.data);
        } catch (err) {
          console.error('Error fetching current user state', err);
        }
      }
    };
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (!router.isReady) return;

    const fetchVideos = async () => {
      if (loading) return;
      setLoading(true);
      try {
        let fetchedVideos: any[] = [];

        // If a shared video link was clicked, fetch it first on page 1
        if (router.query.videoId && page === 1 && !initialVideoFetched) {
          try {
            const singleRes = await api.get(`/videos/${router.query.videoId}`);
            fetchedVideos.push(singleRes.data);
            setInitialVideoFetched(true);
          } catch (e) {
            console.error('Shared video not found', e);
          }
        }

        const isUserLoggedIn = !!localStorage.getItem('token');
        const endpoint = isUserLoggedIn ? `/videos/recommended?page=${page}&limit=5` : `/videos/feed?page=${page}&limit=5`;
        const res = await api.get(endpoint);

        if (res.data.length === 0) {
          setHasMore(false);
        } else {
          // Add feed videos, avoiding duplicates 
          const feedVideos = res.data.filter((v: any) => !fetchedVideos.some((p: any) => p._id === v._id));
          fetchedVideos = [...fetchedVideos, ...feedVideos];
        }

        setVideos((prev: any) => {
          const uniqueNew = fetchedVideos.filter((v: any) => !prev.some((p: any) => p._id === v._id));
          return page === 1 ? fetchedVideos : [...prev, ...uniqueNew];
        });
      } catch (err) {
        console.error('Error fetching videos', err);
      } finally {
        setLoading(false);
      }
    };

    fetchVideos();
  }, [page, router.isReady]);

  const handleScroll = (e: any) => {
    const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;

    // Calculate current video index
    const index = Math.round(scrollTop / clientHeight);
    if (index !== currentVideoIndex) {
      setCurrentVideoIndex(index);
    }

    if (scrollHeight - scrollTop <= clientHeight + 50 && hasMore && !loading) {
      setPage(prev => prev + 1);
    }
  };

  return (
    <Layout>
      <div className="min-h-[calc(100vh-64px)] md:min-h-screen p-0 md:p-4 flex justify-center w-full bg-black md:bg-transparent">
        <div className="max-w-5xl w-full grid grid-cols-1 md:grid-cols-4 gap-0 md:gap-6">

          {/* Left Sidebar: Suggestions */}
          <div className="hidden md:block col-span-1 border-gray-200">
            <SuggestedUsers />
          </div>

          {/* Main Content: Video Feed */}
          <div className="col-span-1 md:col-span-3 lg:col-span-2 h-[calc(100vh-64px)] md:h-[88vh] flex justify-center mx-auto w-full md:max-w-sm md:rounded-lg shadow-xl overflow-hidden bg-black">
            <div
              className="h-full w-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide bg-black text-white"
              onScroll={handleScroll}
            >
              {videos.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-500 bg-white">
                  <p>No videos yet. Be the first to upload!</p>
                </div>
              ) : (
                videos.map((video: any, index: number) => (
                  <div key={video._id} data-index={index} className="video-card-container h-full w-full snap-start relative">
                    <VideoCard video={video} isActive={index === currentVideoIndex} />
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right Sidebar: Following List & Chat */}
          <div className="hidden lg:block lg:col-span-1 border-gray-200">
            {currentUser && currentUser.following && (
              <FollowingList
                following={currentUser.following}
                onMessage={(user) => setChatReceiver(user)}
              />
            )}
          </div>

        </div>
      </div>

      {chatReceiver && (
        <ChatWindow
          receiverId={chatReceiver._id}
          receiverName={chatReceiver.username}
          receiverPic={chatReceiver.profilePic}
          onClose={() => setChatReceiver(null)}
        />
      )}
    </Layout>
  );
}
