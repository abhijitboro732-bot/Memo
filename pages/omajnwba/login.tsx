import { useState } from 'react';
import { useRouter } from 'next/router';
import api from '../../services/api';
import Link from 'next/link';
import { FaUserShield } from 'react-icons/fa';

export default function AdminLogin() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await api.post('/auth/admin/login', { email, password });
            const { token, user } = res.data;

            // Set admin token and save admin user manually, completely isolate from normal user
            localStorage.setItem('adminToken', token);
            localStorage.setItem('adminUser', JSON.stringify(user));

            router.push('/omajnwba/dashboard');
        } catch (err: any) {
            alert(err.response?.data?.message || 'Login failed');
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
            <div className="bg-gray-800 p-8 rounded-lg shadow-xl w-full max-w-sm border border-pink-500/30">
                <div className="flex justify-center mb-6 text-pink-500 text-4xl">
                    <FaUserShield />
                </div>
                <h1 className="text-2xl font-bold mb-6 text-center text-white">Super Omajanwba Login</h1>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <input
                        type="email"
                        placeholder="Omajanwba Email"
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
                    <button type="submit" className="bg-pink-600 text-white p-3 rounded font-bold hover:bg-pink-700 transition mt-2">
                        Login to Dashboard
                    </button>

                    <p className="text-center text-sm mt-4 text-gray-400">
                        No Omajanwba account? <Link href="/omajnwba/register" className="text-pink-500 hover:underline">Register here</Link>
                    </p>
                </form>
            </div>
        </div>
    );
}
