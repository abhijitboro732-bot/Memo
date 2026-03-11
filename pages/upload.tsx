import { useState } from 'react';
import { useRouter } from 'next/router';
import api from '../services/api';
import Layout from '../components/Layout';

export default function Upload() {
    const [file, setFile] = useState<File | null>(null);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFile(e.target.files[0]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) return;

        setLoading(true);
        const formData = new FormData();
        formData.append('video', file);
        formData.append('title', title);
        formData.append('description', description);

        try {
            await api.post('/videos/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            router.push('/');
        } catch (err) {
            console.error('Upload failed', err);
            alert('Upload failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Layout>
            <div className="max-w-md mx-auto bg-white h-full shadow-xl p-4 text-black">
                <h1 className="text-2xl font-bold mb-4">Upload Video</h1>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <input
                        type="file"
                        accept="video/*"
                        onChange={handleFileChange}
                        className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-pink-500 file:text-white hover:file:bg-pink-600"
                        required
                    />
                    <input
                        type="text"
                        placeholder="Title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="p-2 rounded bg-gray-50 border border-gray-300 text-black focus:outline-none focus:border-pink-500"
                        required
                    />
                    <textarea
                        placeholder="Description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="p-2 rounded bg-gray-50 border border-gray-300 text-black focus:outline-none focus:border-pink-500"
                        rows={3}
                    />
                    <button
                        type="submit"
                        disabled={loading}
                        className={`bg-pink-500 text-white p-2 rounded font-bold ${loading ? 'opacity-50' : 'hover:bg-pink-600'}`}
                    >
                        {loading ? 'Uploading...' : 'Post'}
                    </button>
                </form>
            </div>
        </Layout>
    );
}
