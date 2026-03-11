import { useState, useRef } from 'react';
import AvatarEditor from 'react-avatar-editor';
import { FaTimes } from 'react-icons/fa';

interface ImageCropperProps {
    image: File | string;
    onClose: () => void;
    onSave: (croppedImage: Blob) => void;
}

export default function ImageCropper({ image, onClose, onSave }: ImageCropperProps) {
    const editorRef = useRef<AvatarEditor>(null);
    const [scale, setScale] = useState(1);

    const handleSave = () => {
        if (editorRef.current) {
            editorRef.current.getImageScaledToCanvas().toBlob((blob) => {
                if (blob) onSave(blob);
            }, 'image/jpeg');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-sm relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-500 hover:text-gray-800"
                >
                    <FaTimes size={20} />
                </button>

                <h2 className="text-xl font-bold mb-4 text-black">Crop Profile Photo</h2>

                <div className="flex justify-center bg-gray-100 rounded-lg overflow-hidden mb-4 p-2">
                    <AvatarEditor
                        ref={editorRef}
                        image={image}
                        width={250}
                        height={250}
                        border={20}
                        borderRadius={125}
                        color={[255, 255, 255, 0.6]} // RGBA
                        scale={scale}
                        rotate={0}
                    />
                </div>

                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Zoom</label>
                    <input
                        type="range"
                        min="1"
                        max="3"
                        step="0.01"
                        value={scale}
                        onChange={(e) => setScale(parseFloat(e.target.value))}
                        className="w-full accent-pink-500"
                    />
                </div>

                <div className="flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 font-semibold text-gray-600 hover:bg-gray-100 rounded"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-4 py-2 font-bold text-white bg-pink-500 hover:bg-pink-600 rounded"
                    >
                        Save Photo
                    </button>
                </div>
            </div>
        </div>
    );
}
