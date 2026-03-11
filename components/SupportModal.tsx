import { useState, useEffect } from 'react';
import api from '../services/api';
import { FaTimes, FaPaperPlane } from 'react-icons/fa';

interface SupportModalProps {
    onClose: () => void;
}

export default function SupportModal({ onClose }: SupportModalProps) {
    const [message, setMessage] = useState('');
    const [tickets, setTickets] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchTickets();
    }, []);

    const fetchTickets = async () => {
        try {
            const res = await api.get('/users/support/tickets');
            setTickets(res.data);
        } catch (err) {
            console.error('Error fetching tickets', err);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim()) return;

        setLoading(true);
        try {
            await api.post('/users/support', { message });
            setMessage('');
            fetchTickets();
        } catch (err) {
            console.error('Error submitting ticket', err);
            alert('Failed to send message.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-md h-[80vh] flex flex-col overflow-hidden relative shadow-2xl">
                {/* Header */}
                <div className="bg-pink-500 text-white p-4 flex justify-between items-center shadow-md z-10">
                    <div>
                        <h2 className="font-bold text-lg">Customer Support</h2>
                        <p className="text-xs text-pink-100">Send us a message</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                        <FaTimes />
                    </button>
                </div>

                {/* Messages List */}
                <div className="flex-1 overflow-y-auto p-4 bg-gray-50 flex flex-col gap-4">
                    {tickets.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400">
                            <span className="text-4xl mb-2">👋</span>
                            <p>How can we help you today?</p>
                        </div>
                    ) : (
                        tickets.slice().reverse().map((ticket) => (
                            <div key={ticket._id} className="flex flex-col gap-2">
                                {/* User Message */}
                                <div className="self-end bg-pink-100 text-pink-900 px-4 py-2 rounded-2xl rounded-tr-sm max-w-[85%] shadow-sm">
                                    <p className="text-sm">{ticket.message}</p>
                                    <span className="text-[10px] text-pink-600/60 block mt-1 text-right">
                                        {new Date(ticket.createdAt).toLocaleDateString()}
                                    </span>
                                </div>
                                
                                {/* Admin Reply */}
                                {ticket.adminReply && (
                                    <div className="self-start bg-white border border-gray-200 text-gray-800 px-4 py-2 rounded-2xl rounded-tl-sm max-w-[85%] shadow-sm flex items-start gap-2 relative mt-2">
                                        <div className="absolute -left-2 -top-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold border-2 border-white shadow-sm z-10">
                                            Me
                                        </div>
                                        <div>
                                            <p className="text-sm mt-1">{ticket.adminReply}</p>
                                            <span className="text-[10px] text-gray-400 block mt-1">
                                                Omajanwba Reply • {new Date(ticket.updatedAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>

                {/* Input Area */}
                <div className="p-4 bg-white border-t border-gray-100">
                    <form onSubmit={handleSubmit} className="flex gap-2">
                        <input
                            type="text"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Type your concern..."
                            className="flex-1 bg-gray-100 text-black px-4 py-3 rounded-full outline-none focus:ring-2 focus:ring-pink-500/50 transition-all text-sm"
                            disabled={loading}
                        />
                        <button
                            type="submit"
                            disabled={!message.trim() || loading}
                            className="bg-pink-500 hover:bg-pink-600 disabled:bg-pink-300 text-white w-12 h-12 rounded-full flex items-center justify-center transition-colors shadow-sm"
                        >
                            <FaPaperPlane className="relative right-[1px] bottom-[1px]" />
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
