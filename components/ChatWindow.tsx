import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import api from '../services/api';
import { FaPaperPlane, FaImage, FaTimes, FaPlay } from 'react-icons/fa';

interface ChatProps {
    receiverId: string;
    receiverName: string;
    receiverPic?: string;
    onClose: () => void;
}

export default function ChatWindow({ receiverId, receiverName, receiverPic, onClose }: ChatProps) {
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [image, setImage] = useState<File | null>(null);
    const [socket, setSocket] = useState<any>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const currentUser = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}') : {};

    useEffect(() => {
        // Initialize Socket
        const newSocket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000');
        setSocket(newSocket);

        newSocket.emit('join_room', currentUser.id);

        newSocket.on('receive_message', (message: any) => {
            if (message.sender === receiverId || message.sender === currentUser.id) {
                setMessages((prev) => [...prev, message]);
            }
        });

        // Fetch History
        fetchHistory();

        return () => {
            newSocket.disconnect();
        };
    }, [receiverId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const fetchHistory = async () => {
        try {
            const res = await api.get(`/chat/history/${receiverId}`);
            setMessages(res.data);
        } catch (err) {
            console.error('Error fetching chat history', err);
        }
    };

    const handleSendMessage = async () => {
        if (!newMessage.trim() && !image) return;

        const formData = new FormData();
        formData.append('receiver', receiverId);
        formData.append('text', newMessage);
        if (image) {
            formData.append('image', image);
        }

        try {
            // 1. Save to DB (and upload image)
            const res = await api.post('/chat/send', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            const savedMessage = res.data;

            // 2. Emit via Socket
            socket.emit('send_message', savedMessage);

            // 3. Update Local UI (if not already handled by receive_message for self)
            // Ideally receive_message handles incoming, but for self we might want instant feedback
            // or better, just append it.
            setMessages(prev => [...prev, savedMessage]);

            setNewMessage('');
            setImage(null);
        } catch (err) {
            console.error('Error sending message', err);
        }
    };

    return (
        <div className="fixed bottom-0 right-0 md:right-10 w-full md:w-96 h-[80vh] bg-white shadow-2xl rounded-t-xl z-50 flex flex-col border border-gray-200">
            {/* Header */}
            <div className="p-4 bg-pink-600 text-white rounded-t-xl flex justify-between items-center shadow-md">
                <div className="flex items-center gap-2">
                    {receiverPic && <img src={receiverPic} className="w-8 h-8 rounded-full border border-white" />}
                    <span className="font-bold">{receiverName}</span>
                </div>
                <button onClick={onClose}><FaTimes /></button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.sender === currentUser.id ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[75%] p-3 rounded-lg ${msg.sender === currentUser.id
                            ? 'bg-pink-500 text-white rounded-tr-none'
                            : 'bg-white text-gray-800 border border-gray-200 rounded-tl-none'
                            } shadow-sm`}>
                            {msg.image && (
                                <img src={msg.image} className="w-full rounded mb-2" alt="shared" />
                            )}
                            {msg.sharedVideo && (
                                <div
                                    className="mb-2 w-48 h-64 bg-black rounded-lg overflow-hidden relative group cursor-pointer"
                                    onClick={() => window.open(`/?videoId=${msg.sharedVideo._id}`, '_self')}
                                >
                                    <video
                                        src={msg.sharedVideo.videoUrl.startsWith('http') ? msg.sharedVideo.videoUrl : `${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000'}${msg.sharedVideo.videoUrl}`}
                                        className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                                    />
                                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/20 group-hover:bg-transparent transition-colors">
                                        <FaPlay className="text-white text-3xl drop-shadow-md mb-2" />
                                        {msg.sharedVideo.userId && <span className="text-white text-xs font-bold drop-shadow-md">@{msg.sharedVideo.userId.username}</span>}
                                    </div>
                                </div>
                            )}
                            {msg.text && (
                                <p className="whitespace-pre-wrap">
                                    {msg.text.split(/(https?:\/\/[^\s]+)/g).map((part: string, i: number) => {
                                        // If this part is a link and we already have a specialized sharedVideo preview for it, hide the raw link
                                        if (msg.sharedVideo && part.match(/(https?:\/\/[^\s]+)/) && part.includes(`videoId=${msg.sharedVideo._id}`)) {
                                            return null;
                                        }

                                        return part.match(/(https?:\/\/[^\s]+)/) ? (
                                            <a
                                                key={i}
                                                href={part}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="underline hover:text-pink-200 break-all"
                                            >
                                                {part}
                                            </a>
                                        ) : (
                                            <span key={i}>{part}</span>
                                        );
                                    })}
                                </p>
                            )}
                            <span className="text-[10px] opacity-70 block text-right mt-1">
                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 bg-white border-t">
                {image && (
                    <div className="flex items-center justify-between bg-gray-100 p-2 mb-2 rounded text-xs">
                        <span className="truncate max-w-[200px] text-gray-600">{image.name}</span>
                        <button onClick={() => setImage(null)} className="text-red-500 hover:text-red-700">Remove</button>
                    </div>
                )}
                <div className="flex gap-2 items-center">
                    <button onClick={() => fileInputRef.current?.click()} className="text-gray-500 hover:text-pink-500 p-2">
                        <FaImage size={20} />
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/*"
                        onChange={(e) => e.target.files && setImage(e.target.files[0])}
                    />

                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                        placeholder="Type a message..."
                        className="flex-1 p-2 border rounded-full focus:outline-none focus:border-pink-500 bg-gray-50 text-black px-4"
                    />
                    <button
                        onClick={handleSendMessage}
                        className="bg-pink-600 text-white p-2.5 rounded-full hover:bg-pink-700 transition-colors shadow-sm"
                        disabled={!newMessage.trim() && !image}
                    >
                        <FaPaperPlane size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
}
