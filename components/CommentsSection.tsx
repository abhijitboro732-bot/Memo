import { useState } from 'react';
import { FaPaperPlane, FaTimes, FaEdit, FaTrash, FaReply } from 'react-icons/fa';
import api from '../services/api';

interface Comment {
    _id: string;
    userId: { _id: string; username: string; profilePic?: string };
    text: string;
    createdAt: string;
    replies?: Comment[];
}

interface CommentsSectionProps {
    videoId: string;
    initialComments: Comment[];
    onClose: () => void;
}

export default function CommentsSection({ videoId, initialComments, onClose }: CommentsSectionProps) {
    const [comments, setComments] = useState<Comment[]>(initialComments);
    const [newComment, setNewComment] = useState('');
    const [replyingTo, setReplyingTo] = useState<string | null>(null);
    const [editing, setEditing] = useState<{ id: string; text: string } | null>(null);
    const [user] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('user');
            return saved ? JSON.parse(saved) : null;
        }
        return null;
    });

    const handlePostComment = async () => {
        if (!newComment.trim()) return;
        try {
            const res = await api.post(`/videos/comment/${videoId}`, { text: newComment });
            setComments(res.data.comments);
            setNewComment('');
        } catch (err) {
            console.error('Error posting comment', err);
        }
    };

    const handleReply = async (commentId: string) => {
        if (!newComment.trim()) return;
        try {
            const res = await api.post(`/videos/comment/${videoId}/reply/${commentId}`, { text: newComment });
            setComments(res.data.comments);
            setNewComment('');
            setReplyingTo(null);
        } catch (err) {
            console.error('Error replying', err);
        }
    };

    const handleEdit = async () => {
        if (!editing || !editing.text.trim()) return;
        try {
            const res = await api.put(`/videos/comment/${videoId}/${editing.id}`, { text: editing.text });
            setComments(res.data.comments);
            setEditing(null);
        } catch (err) {
            console.error('Error editing', err);
        }
    };

    const handleDelete = async (commentId: string) => {
        if (!confirm('Delete this comment?')) return;
        try {
            const res = await api.delete(`/videos/comment/${videoId}/${commentId}`);
            setComments(res.data.comments);
        } catch (err) {
            console.error('Error deleting', err);
        }
    };

    return (
        <div className="absolute inset-0 bg-black/80 z-50 flex flex-col justify-end">
            <div className="bg-white rounded-t-xl h-[70%] flex flex-col w-full max-w-md mx-auto">
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b">
                    <h3 className="font-bold text-black">Comments ({comments.length})</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-black">
                        <FaTimes />
                    </button>
                </div>

                {/* Comments List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {comments.map((comment) => (
                        <div key={comment._id} className="text-sm">
                            <div className="flex gap-2">
                                <span className="font-bold text-black">{comment.userId?.username || 'User'}</span>
                                <span className="text-gray-700 break-words flex-1">{comment.text}</span>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 mt-1 text-xs text-gray-500">
                                <button onClick={() => setReplyingTo(comment._id)} className="hover:text-pink-500">Reply</button>
                                {user && user._id === comment.userId?._id && (
                                    <>
                                        <button onClick={() => setEditing({ id: comment._id, text: comment.text })} className="hover:text-blue-500">Edit</button>
                                        <button onClick={() => handleDelete(comment._id)} className="hover:text-red-500">Delete</button>
                                    </>
                                )}
                            </div>

                            {/* Replies */}
                            {comment.replies && comment.replies.length > 0 && (
                                <div className="ml-6 mt-2 space-y-2 border-l-2 pl-2 border-gray-200">
                                    {comment.replies.map((reply) => (
                                        <div key={reply._id}>
                                            <div className="flex gap-2">
                                                <span className="font-bold text-gray-800">{reply.userId?.username || 'User'}</span>
                                                <span className="text-gray-600">{reply.text}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                    {comments.length === 0 && <p className="text-center text-gray-400">No comments yet.</p>}
                </div>

                {/* Input Area */}
                <div className="p-4 border-t bg-gray-50">
                    {replyingTo && (
                        <div className="flex justify-between text-xs text-gray-500 mb-2">
                            <span>Replying to comment...</span>
                            <button onClick={() => setReplyingTo(null)} className="text-red-500">Cancel</button>
                        </div>
                    )}
                    {editing && (
                        <div className="flex justify-between text-xs text-gray-500 mb-2">
                            <span>Editing comment...</span>
                            <button onClick={() => setEditing(null)} className="text-red-500">Cancel</button>
                        </div>
                    )}

                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={editing ? editing.text : newComment}
                            onChange={(e) => editing ? setEditing({ ...editing, text: e.target.value }) : setNewComment(e.target.value)}
                            placeholder={replyingTo ? "Write a reply..." : "Add a comment..."}
                            className="flex-1 p-2 rounded border border-gray-300 focus:outline-none focus:border-pink-500 text-black"
                        />
                        <button
                            onClick={editing ? handleEdit : (replyingTo ? () => handleReply(replyingTo) : handlePostComment)}
                            className="bg-pink-500 text-white p-2 rounded hover:bg-pink-600 transition-colors"
                        >
                            <FaPaperPlane />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
