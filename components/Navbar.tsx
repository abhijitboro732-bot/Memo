import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { FaHome, FaPlus, FaUser, FaSignOutAlt, FaLock, FaSearch, FaCommentDots, FaUserShield } from 'react-icons/fa';

export default function Navbar() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);

    const [adminUser, setAdminUser] = useState<any>(null);

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) setUser(JSON.parse(storedUser));

        const storedAdmin = localStorage.getItem('adminUser');
        if (storedAdmin) setAdminUser(JSON.parse(storedAdmin));
    }, []);

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/login');
    };

    return (
        <>
            {/* Desktop Navbar */}
            <nav className="hidden md:flex fixed top-0 w-full bg-white/90 backdrop-blur-sm text-black border-b border-gray-200 p-4 justify-between items-center z-50 transition-colors">
                <Link href="/" className="text-xl font-bold flex items-center gap-2">
                    <Image src="/favicon.png" alt="Meemo Logo" width={32} height={32} className="rounded-full shadow-sm" />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-500 font-extrabold text-2xl">Meemo</span>
                </Link>

                <div className="flex gap-6 text-2xl text-gray-600 items-center">
                    <Link href="/" className="hover:text-pink-500 transition-colors"><FaHome /></Link>
                    {user ? (
                        <>
                            <Link href="/upload" className="hover:text-pink-500 transition-colors"><FaPlus /></Link>
                            <Link href={`/profile/${user.id}`} className="hover:text-pink-500 transition-colors"><FaUser /></Link>
                            <button onClick={logout} className="hover:text-red-500 transition-colors"><FaSignOutAlt /></button>
                        </>
                    ) : (
                        <Link href="/login" className="text-sm bg-pink-500 text-white px-4 py-1 rounded-full hover:bg-pink-600 transition-colors">Login</Link>
                    )}
                </div>
            </nav>

            {/* Mobile Optional Top for Logout (Preserving Function Logic) */}
            <div className="md:hidden fixed top-0 right-0 p-4 z-50 pointer-events-none">
                <div className="pointer-events-auto">
                    {user ? (
                        <button onClick={logout} className="text-white/80 drop-shadow-md hover:text-red-400 transition-colors"><FaSignOutAlt className="text-xl" /></button>
                    ) : (
                        <Link href="/login" className="text-xs bg-pink-500 text-white px-3 py-1 rounded-full hover:bg-pink-600 transition-colors">Login</Link>
                    )}
                </div>
            </div>

            {/* Mobile Bottom Bar (TikTok Style) */}
            <nav className="md:hidden fixed bottom-0 w-full bg-black text-white border-t border-gray-900 flex justify-around items-center h-[60px] z-50 pb-safe">
                <Link href="/" className={`flex flex-col items-center justify-center w-[20%] ${router.pathname === '/' ? 'text-white' : 'text-gray-400'}`}>
                    <FaHome className="text-2xl mb-0.5" />
                    <span className="text-[10px] font-medium">Home</span>
                </Link>
                <Link href="/discover" className={`flex flex-col items-center justify-center w-[20%] ${router.pathname === '/discover' ? 'text-white' : 'text-gray-400'}`}>
                    <FaSearch className="text-[22px] mb-0.5" />
                    <span className="text-[10px] font-medium">Discover</span>
                </Link>
                <Link href={user ? "/upload" : "/login"} className="flex flex-col items-center justify-center w-[20%]">
                    <div className="relative flex items-center justify-center w-11 h-[28px] mt-1">
                        <div className="absolute h-[28px] w-8 bg-cyan-400 rounded-lg left-[2px]"></div>
                        <div className="absolute h-[28px] w-8 bg-pink-500 rounded-lg right-[2px]"></div>
                        <div className="absolute h-[28px] w-8 bg-white rounded-lg flex items-center justify-center z-10">
                            <FaPlus className="text-black text-[16px] font-bold" />
                        </div>
                    </div>
                </Link>
                <Link href="/chat" className={`flex flex-col items-center justify-center w-[20%] ${router.pathname === '/chat' ? 'text-white' : 'text-gray-400'}`}>
                    <FaCommentDots className="text-2xl mb-0.5" />
                    <span className="text-[10px] font-medium">Chat</span>
                </Link>
                <Link href={user ? `/profile/${user.id}` : "/login"} className={`flex flex-col items-center justify-center w-[20%] ${router.pathname.startsWith('/profile') ? 'text-white' : 'text-gray-400'}`}>
                    <FaUser className="text-[22px] mb-0.5" />
                    <span className="text-[10px] font-medium">Me</span>
                </Link>
            </nav>
        </>
    );
}
