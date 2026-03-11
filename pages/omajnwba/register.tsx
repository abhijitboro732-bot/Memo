import { useState } from 'react';
import { useRouter } from 'next/router';
import api from '../../services/api';
import Link from 'next/link';
import { FaLock } from 'react-icons/fa';

export default function AdminRegister() {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [adminSecret, setAdminSecret] = useState('');
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/auth/admin/register', { username, email, password, adminSecret });
            router.push('/omajnwba/login');
        } catch (err: any) {
            alert(err.response?.data?.message || 'Registration failed');
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
            <div className="bg-gray-800 p-8 rounded-lg shadow-xl w-full max-w-sm border border-pink-500/30">
                <div className="flex justify-center mb-6 text-pink-500 text-4xl">
                    <FaLock />
                </div>
                <h1 className="text-2xl font-bold mb-6 text-center text-white">Super Omajanwba Register</h1>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <input
                        type="text"
                        placeholder="Username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="p-3 border rounded bg-gray-700 text-white border-gray-600 focus:outline-none focus:border-pink-500"
                        required
                    />
                    <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="p-3 border rounded bg-gray-700 text-white border-gray-600 focus:outline-none focus:border-pink-500"
                        required
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="p-3 border rounded bg-gray-700 text-white border-gray-600 focus:outline-none focus:border-pink-500"
                        required
                    />
                    <input
                        type="password"
                        placeholder="Super Omajanwba Secret Key"
                        value={adminSecret}
                        onChange={(e) => setAdminSecret(e.target.value)}
                        className="p-3 border rounded bg-pink-900/50 text-white border-pink-500/50 focus:outline-none focus:border-pink-500"
                        required
                    />
                    <button type="submit" className="bg-pink-600 text-white p-3 rounded font-bold hover:bg-pink-700 transition mt-2">
                        Register Omajanwba
                    </button>

                    <p className="text-center text-sm mt-4 text-gray-400">
                        Already an Omajanwba? <Link href="/omajnwba/login" className="text-pink-500 hover:underline">Login here</Link>
                    </p>
                </form>
            </div>
        </div>
    );
}
